import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { PageSEO } from "@/components/seo/PageSEO";
import { Link, useNavigate, useSearchParams, useLocation, type NavigateFunction } from "react-router-dom";

import { Eye, EyeOff, Loader2, Mail, Lock, ShieldAlert, AlertTriangle } from "lucide-react";
import { AuthBrandingPanel } from "./auth/AuthBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useIPValidation } from "@/hooks/useIPValidation";
import { supabase } from "@/integrations/supabase/client";
import {
  validateLoginCredentials,
  type LoginCredentials,
  type LoginFieldErrors,
} from "@/lib/auth/login-validation";
import { getSsoFailureMessage, SSO_ERROR_QUERY_PARAM } from "@/lib/auth/sso-errors";

import { safeInternalPath } from "@/lib/auth/safe-internal-path";
import { getDefaultRouteByRole } from "@/lib/auth/auth-utils";

const ForgotPasswordForm = lazy(() => import("@/components/auth/ForgotPasswordForm"));

interface RedirectSource {
  from?: { pathname?: string; search?: string; hash?: string };
}

function requestedPath(searchParams: URLSearchParams, state: unknown): string | null {
  const from = (state as RedirectSource | null)?.from;
  const restored = from?.pathname ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : null;
  return searchParams.get("redirect") ?? restored;
}

function mayRedirect(hasUser: boolean, authLoading: boolean, rolesLoaded: boolean, role: AppRole | null, isSubmitting: boolean, ipBlocked: boolean): boolean {
  return hasUser && !authLoading && rolesLoaded && Boolean(role) && !isSubmitting && !ipBlocked;
}

function useAuthenticatedRedirect(options: {
  hasUser: boolean;
  authLoading: boolean;
  rolesLoaded: boolean;
  role: AppRole | null;
  isSubmitting: boolean;
  ipBlocked: boolean;
  searchParams: URLSearchParams;
  location: { pathname: string; state: unknown };
  navigate: NavigateFunction;
}) {
  const { hasUser, authLoading, rolesLoaded, role, isSubmitting, ipBlocked, searchParams, location, navigate } = options;
  useEffect(() => {
    if (!mayRedirect(hasUser, authLoading, rolesLoaded, role, isSubmitting, ipBlocked)) return;
    const destination = safeInternalPath(requestedPath(searchParams, location.state), getDefaultRouteByRole(role));
    if (location.pathname !== destination) navigate(destination, { replace: true });
  }, [hasUser, authLoading, rolesLoaded, role, isSubmitting, ipBlocked, searchParams, location.state, location.pathname, navigate]);
}

export default function Auth() {

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signIn, signOut, role, rolesLoaded } = useAuth();
  const { validateIPForAuthenticatedUser, logLoginAttempt } = useIPValidation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIP, setBlockedIP] = useState<string | null>(null);
  // Fallback social → email/senha: mensagem amigável quando OAuth falha.
  const [socialError, setSocialError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Exibe uma mensagem controlada para falhas SSO e remove os parâmetros para
  // que dados fornecidos pela URL nunca sejam refletidos nem persistam.
  useEffect(() => {
    const reason = searchParams.get(SSO_ERROR_QUERY_PARAM);
    const hasLegacyError = searchParams.has("error");
    const message = getSsoFailureMessage(reason, hasLegacyError);
    if (message) {
      setSocialError(message);
      const next = new URLSearchParams(searchParams);
      next.delete(SSO_ERROR_QUERY_PARAM);
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const focusEmailFallback = useCallback(() => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Só redireciona após carregar papéis e encerrar a validação da entrada.
  useAuthenticatedRedirect({ hasUser: Boolean(user), authLoading, rolesLoaded, role, isSubmitting, ipBlocked, searchParams, location, navigate });

  const handleLogin = async (data: LoginCredentials) => {
    void import("@/lib/diagnostics").then(({ diagnostics }) => {
      diagnostics.log("info", "Auth", "Iniciando autenticação");
    });
    setIsSubmitting(true);

    setIpBlocked(false);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        void import("@/lib/diagnostics").then(({ diagnostics }) => {
          diagnostics.log("error", "Auth", `Erro no signIn: ${error.message}`);
        });
        void logLoginAttempt(data.email, null, false, error.message);

        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: "Email ou senha incorretos",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: error.message,
          });
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        void import("@/lib/diagnostics").then(({ diagnostics }) => {
          diagnostics.log("info", "Auth", "Validando restrições de acesso");
        });
        const ipValidation = await validateIPForAuthenticatedUser(userId);

        
        if (!ipValidation.isAllowed && ipValidation.hasRestrictions) {
          await signOut();
          const reason = ipValidation.reason || 'access_blocked';
          await logLoginAttempt(data.email, userId, false, `${reason}: ${ipValidation.error}`);
          
          setIpBlocked(true);
          setBlockedIP(ipValidation.currentIP);
          
          toast({
            variant: "destructive",
            title: "Acesso Bloqueado",
            description: ipValidation.error || `Seu IP (${ipValidation.currentIP}) não está autorizado.`,
            duration: 10000,
          });
          return;
        }

        await logLoginAttempt(data.email, userId, true);
      }

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso",
      });
      
      // The useEffect for [user, role] will handle the automatic redirection
      // once the AuthContext updates the role after signIn.
    } catch {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLoginCredentials(credentials);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void handleLogin(credentials);
  };

  const updateCredential = (field: keyof LoginCredentials, value: string) => {
    setCredentials(current => ({ ...current, [field]: value }));
    setFieldErrors(current => current[field] ? { ...current, [field]: undefined } : current);
  };

  return (
    <main className="min-h-screen flex bg-[#F7FAFA] dark:bg-background" role="main" aria-label="Autenticação">
      <PageSEO
        title="Login"
        description="Acesse o Portal de Compras Sicoob. Faça login para gerenciar seus orçamentos e produtos."
        path="/login"
        noIndex
      />
      {/* Left side - Branding */}
      <AuthBrandingPanel />

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="text-center lg:hidden space-y-3">
            <div className="inline-flex items-center justify-center rounded-xl bg-[#003641] px-6 py-4 mx-auto">
              <img
                src="/brand/sicoob-logo.png"
                alt="Sicoob"
                width={180} height={40} className="h-auto w-44 object-contain"
              />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">
                Portal de brindes
              </p>
              <p className="text-sm text-muted-foreground">
                Portal de Compras
              </p>
            </div>
          </div>

          {/* IP Blocked Alert */}
          {ipBlocked && (
            <Card className="border-destructive bg-destructive/10 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-semibold text-destructive">
                      Acesso Bloqueado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seu endereço IP (<span className="font-mono font-semibold text-foreground">{blockedIP}</span>) não está autorizado a acessar esta conta.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com o administrador do sistema para liberar seu acesso.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setIpBlocked(false);
                        setBlockedIP(null);
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auth Card */}
          <Card className={`border-border/70 bg-card shadow-sm ${ipBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {showForgotPassword ? (
              <CardContent className="pt-6 pb-6">
                <Suspense fallback={<div className="min-h-40" role="status" aria-label="Carregando recuperação de senha" />}>
                  <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
                </Suspense>
              </CardContent>
            ) : (
            <>
              <CardHeader className="pb-4">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-semibold font-display tracking-tight text-foreground">Acesse seu portal</h1>
                  <p className="text-sm text-muted-foreground">Use seu e-mail de trabalho e sua senha.</p>
                </div>
              </CardHeader>

              <CardContent className="pt-2 space-y-6">
                  {socialError && (
                    <div
                      role="alert"
                      data-testid="social-login-fallback-banner"
                      className="rounded-lg border-warning/40 bg-warning/10 p-3 text-sm text-foreground space-y-2 animate-fade-in"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">Não foi possível concluir a autenticação.</p>
                          <p className="text-xs text-muted-foreground break-words">{socialError}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-8 text-xs"
                          onClick={focusEmailFallback}
                          data-testid="social-fallback-use-email"
                        >
                          Entrar com e-mail e senha
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setSocialError(null)}
                        >
                          Dispensar
                        </Button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate aria-busy={isSubmitting || authLoading} data-testid="login-form">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground">E-mail de trabalho</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          data-testid="login-email-input"
                          type="email"
                          placeholder="nome@cooperativa.com.br"
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={!!fieldErrors.email}
                          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                          className="h-12 pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                          value={credentials.email}
                          onChange={event => updateCredential("email", event.target.value)}
                          ref={emailInputRef}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm text-destructive" id="login-email-error" role="alert" data-testid="login-error-msg">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-foreground">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          data-testid="login-password-input"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          aria-invalid={!!fieldErrors.password}
                          aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                          placeholder="••••••••"
                          className="h-12 pl-10 pr-14 bg-input border-border focus:border-primary focus:ring-primary"
                          value={credentials.password}
                          onChange={event => updateCredential("password", event.target.value)}
                        />
                        <button
                          type="button"
                          data-testid="login-password-toggle"
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p id="login-password-error" role="alert" className="text-sm text-destructive">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        data-testid="login-forgot-link"
                        variant="link"
                        className="min-h-11 px-0 text-sm text-primary hover:text-primary/80"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      data-testid="login-submit"
                      variant="default"
                      className="w-full h-12 text-base font-semibold"
                      disabled={isSubmitting || authLoading}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>

                  </form>

                  {import.meta.env.DEV && (
                    <div className="border-t border-border pt-5 text-center">
                      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                        Quer avaliar a experiência antes de conectar o ambiente?
                      </p>
                      <Button asChild type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal border-[#007A70]/35 py-2 text-center leading-tight text-[#005E55] hover:bg-[#EAF8F6]">
                        <Link to="/loja-demo">Explorar loja demonstrativa</Link>
                      </Button>
                    </div>
                  )}
              </CardContent>
            </>
            )}
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito a usuários autorizados.
            <br />
            Para solicitar acesso, procure o responsável por compras da sua cooperativa.
          </p>
        </div>
      </div>
    </main>
  );
}
