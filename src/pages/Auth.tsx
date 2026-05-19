import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageSEO } from "@/components/seo/PageSEO";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Gift, Mail, Lock, ShieldAlert, Globe, Wifi, AlertTriangle } from "lucide-react";
import { AuthBrandingPanel } from "./auth/AuthBranding";
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useIPValidation } from "@/hooks/useIPValidation";
import { PasskeyLogin } from "@/components/auth/PasskeyLogin";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { supabase } from "@/integrations/supabase/client";
import { QuickTestLogin } from "@/components/auth/QuickTestLogin";

import { loginSchema, type LoginFormData } from "@/lib/validations";

type LoginForm = LoginFormData;

import { diagnostics } from "@/lib";

// ContinuousRockets and AuthBrandingPanel extracted to ./auth/AuthBranding.tsx

export default function Auth() {

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signIn, signOut, role, isAuthenticated, roles } = useAuth();
  const { validateIPForAuthenticatedUser, logLoginAttempt, fetchCurrentIP } = useIPValidation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIP, setBlockedIP] = useState<string | null>(null);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [geoLocation, setGeoLocation] = useState<string | null>(null);
  // Fallback social → email/senha: mensagem amigável quando OAuth falha.
  const [socialError, setSocialError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Captura `?error=` vindo do SSOCallbackPage (Google falhou) e exibe o
  // banner de fallback. Limpa o param da URL para não persistir.
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setSocialError(err);
      const next = new URLSearchParams(searchParams);
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSocialError = useCallback((message: string) => {
    setSocialError(message);
    setTimeout(() => emailInputRef.current?.focus(), 50);
  }, []);

  const focusEmailFallback = useCallback(() => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Fetch IP and geolocation via edge function (works in preview + production)
  useEffect(() => {
    const loadIPInfo = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-visitor-info');
        if (!error && data) {
          if (data.ip) setCurrentIP(data.ip);
          if (data.city) setGeoLocation(`${data.city}, ${data.country_code}`);
        }
      } catch {
        // silent fail
      }
    };
    loadIPInfo();
  }, []);

  // Redirect if already logged in - using role-based routing
  useEffect(() => {
    if (user && !authLoading && role) {
      const redirectPath = searchParams.get("redirect") || "/";
      
      // If it's just the root or empty, apply role-based default
      if (redirectPath === "/" || redirectPath === "") {
        import("@/lib/auth/auth-utils").then(({ getDefaultRouteByRole }) => {
          navigate(getDefaultRouteByRole(role));
        });
      } else {
        navigate(redirectPath);
      }
    }
  }, [user, authLoading, navigate, role, searchParams]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = async (data: LoginForm) => {
    diagnostics.log('info', 'Auth', `Iniciando login para ${data.email}`);
    setIsSubmitting(true);

    setIpBlocked(false);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        diagnostics.log('error', 'Auth', `Erro no signIn: ${error.message}`);
        await logLoginAttempt(data.email, null, false, error.message);

        
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
        diagnostics.log('info', 'Auth', `Validando IP para usuário ${userId}`);
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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background" role="main" aria-label="Carregando autenticação">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-background" role="main" aria-label="Autenticação">
      <PageSEO
        title="Login"
        description="Acesse o Portal de Compras Sicoob. Faça login para gerenciar seus orçamentos e produtos."
        path="/login"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Login — Portal Sicoob",
          "description": "Página de autenticação do Portal de Compras Sicoob.",
          "url": "https://criar-together-now.lovable.app/login"
        }}
      />
      {/* Left side - Branding */}
      <AuthBrandingPanel />

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="text-center lg:hidden space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl p-3 border border-border/40 mx-auto">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sicoob_logo.svg/2560px-Sicoob_logo.svg.png" 
                alt="Sicoob" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Portal Sicoob
              </h1>
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
          <Card className={`border-border/60 bg-card shadow-2xl ring-1 ring-border/20 backdrop-blur-sm ${ipBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {showForgotPassword ? (
              <CardContent className="pt-6 pb-6">
                <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
              </CardContent>
            ) : (
            <>
              <CardHeader className="pb-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold font-display text-foreground">Bem-vindo de volta</h2>
                  <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar</p>
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
                          <p className="font-medium">Não consegui te autenticar pelo Google.</p>
                          <p className="text-xs text-muted-foreground break-words">{socialError}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="orange"
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

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" data-testid="login-form">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          data-testid="login-email-input"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                          {...loginForm.register("email")}
                          ref={(el) => {
                            loginForm.register("email").ref(el);
                            emailInputRef.current = el;
                          }}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive" data-testid="login-error-msg">
                          {loginForm.formState.errors.email.message}
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
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-input border-border focus:border-primary focus:ring-primary"
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          data-testid="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        data-testid="login-forgot-link"
                        variant="link"
                        className="p-0 h-auto text-sm text-primary hover:text-primary/80"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      data-testid="login-submit"
                      variant="default"
                      className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                      disabled={isSubmitting}
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

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <SocialLoginButtons onError={handleSocialError} />

                    <PasskeyLogin
                      email={loginForm.watch("email")}
                      disabled={isSubmitting}
                      onSuccess={async (userId) => {
                        toast({
                          title: "Autenticação biométrica",
                          description: "Autenticado com sucesso via passkey!",
                        });
                        navigate("/");
                      }}
                    />
                  </form>
              </CardContent>
            </>
            )}
          </Card>

          {/* Login Rápido para Testes */}
          <QuickTestLogin />

          {/* IP/Location Widget */}
          {currentIP && (
            <div className="flex items-center justify-center gap-3 mx-auto px-5 py-2.5 rounded-full bg-card/80 backdrop-blur-md border border-border/60 shadow-md max-w-fit opacity-0" style={{ animation: 'scale-fade-in 0.5s ease-out 600ms forwards' }}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono">{currentIP}</span>
              </div>
              {geoLocation && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wifi className="h-3.5 w-3.5 text-success" />
                    <span>{geoLocation}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito a usuários autorizados.
            <br />
            Contate o administrador para obter suas credenciais.
          </p>
        </div>
      </div>
    </main>
  );
}
