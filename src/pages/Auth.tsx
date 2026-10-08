import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
  type NavigateFunction,
} from 'react-router-dom';

import { Eye, EyeOff, Loader2, Mail, Lock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { AuthBrandingPanel } from './auth/AuthBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { useAuth, type AppRole } from '@/contexts/AuthContext';
import { useIPValidation } from '@/hooks/useIPValidation';
import { supabase } from '@/integrations/supabase/client';
import {
  validateLoginCredentials,
  type LoginCredentials,
  type LoginFieldErrors,
} from '@/lib/auth/login-validation';
import { getSsoFailureMessage, SSO_ERROR_QUERY_PARAM } from '@/lib/auth/sso-errors';

import { safeInternalPath } from '@/lib/auth/safe-internal-path';
import { getDefaultRouteByRole } from '@/lib/auth/auth-utils';

const ForgotPasswordForm = lazy(() => import('@/components/auth/ForgotPasswordForm'));

interface RedirectSource {
  from?: { pathname?: string; search?: string; hash?: string };
}

function requestedPath(searchParams: URLSearchParams, state: unknown): string | null {
  const from = (state as RedirectSource | null)?.from;
  const restored = from?.pathname ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : null;
  return searchParams.get('redirect') ?? restored;
}

function mayRedirect(
  hasUser: boolean,
  authLoading: boolean,
  rolesLoaded: boolean,
  role: AppRole | null,
  isSubmitting: boolean,
  ipBlocked: boolean,
): boolean {
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
  const {
    hasUser,
    authLoading,
    rolesLoaded,
    role,
    isSubmitting,
    ipBlocked,
    searchParams,
    location,
    navigate,
  } = options;
  useEffect(() => {
    if (!mayRedirect(hasUser, authLoading, rolesLoaded, role, isSubmitting, ipBlocked)) return;
    const destination = safeInternalPath(
      requestedPath(searchParams, location.state),
      getDefaultRouteByRole(role),
    );
    if (location.pathname !== destination) navigate(destination, { replace: true });
  }, [
    hasUser,
    authLoading,
    rolesLoaded,
    role,
    isSubmitting,
    ipBlocked,
    searchParams,
    location.state,
    location.pathname,
    navigate,
  ]);
}

type IpValidationApi = ReturnType<typeof useIPValidation>;

interface LoginBlock {
  currentIP: string | null;
  message: string;
}

async function checkAuthenticatedAccess({
  userId,
  email,
  validateIPForAuthenticatedUser,
  logLoginAttempt,
  signOut,
}: {
  userId?: string;
  email: string;
  validateIPForAuthenticatedUser: IpValidationApi['validateIPForAuthenticatedUser'];
  logLoginAttempt: IpValidationApi['logLoginAttempt'];
  signOut: () => Promise<void>;
}): Promise<LoginBlock | null> {
  if (!userId) return null;
  const validation = await validateIPForAuthenticatedUser(userId);
  if (validation.isAllowed || !validation.hasRestrictions) {
    await logLoginAttempt(email, userId, true);
    return null;
  }

  await signOut();
  const reason = validation.reason || 'access_blocked';
  await logLoginAttempt(email, userId, false, `${reason}: ${validation.error}`);
  return {
    currentIP: validation.currentIP,
    message: validation.error || `Seu IP (${validation.currentIP}) não está autorizado.`,
  };
}

function BlockedIpAlert({
  blocked,
  ip,
  onRetry,
}: {
  blocked: boolean;
  ip: string | null;
  onRetry: () => void;
}) {
  if (!blocked) return null;
  return (
    <Card className="border-destructive bg-destructive/10 shadow-lg">
      <CardContent className="pb-6 pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-destructive">
              Acesso Bloqueado
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu endereço IP (<span className="font-mono font-semibold text-foreground">{ip}</span>
              ) não está autorizado a acessar esta conta.
            </p>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador do sistema para liberar seu acesso.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialErrorBanner({
  message,
  onUseEmail,
  onDismiss,
}: {
  message: string | null;
  onUseEmail: () => void;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      data-testid="social-login-fallback-banner"
      className="animate-fade-in space-y-2 rounded-lg border-warning/40 bg-warning/10 p-3 text-sm text-foreground"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="flex-1 space-y-1">
          <p className="font-medium">Não foi possível concluir a autenticação.</p>
          <p className="break-words text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 text-xs"
          onClick={onUseEmail}
          data-testid="social-fallback-use-email"
        >
          Entrar com e-mail e senha
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onDismiss}>
          Dispensar
        </Button>
      </div>
    </div>
  );
}

function LoginEmailField({
  credentials,
  error,
  inputRef,
  onChange,
}: {
  credentials: LoginCredentials;
  error?: string;
  inputRef: { current: HTMLInputElement | null };
  onChange: (field: keyof LoginCredentials, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="login-email" className="text-foreground">
        E-mail de trabalho
      </Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="login-email"
          data-testid="login-email-input"
          type="email"
          placeholder="nome@cooperativa.com.br"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-email-error' : undefined}
          className="h-12 border-border bg-input pl-10 focus:border-primary focus:ring-primary"
          value={credentials.email}
          onChange={(event) => onChange('email', event.target.value)}
          ref={(element) => {
            inputRef.current = element;
          }}
        />
      </div>
      {error && (
        <p
          className="text-sm text-destructive"
          id="login-email-error"
          role="alert"
          data-testid="login-error-msg"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function LoginPasswordField({
  credentials,
  error,
  showPassword,
  onChange,
  onToggleVisibility,
}: {
  credentials: LoginCredentials;
  error?: string;
  showPassword: boolean;
  onChange: (field: keyof LoginCredentials, value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="login-password" className="text-foreground">
        Senha
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="login-password"
          data-testid="login-password-input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-password-error' : undefined}
          placeholder="••••••••"
          className="h-12 border-border bg-input pl-10 pr-14 focus:border-primary focus:ring-primary"
          value={credentials.password}
          onChange={(event) => onChange('password', event.target.value)}
        />
        <button
          type="button"
          data-testid="login-password-toggle"
          aria-pressed={showPassword}
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -mr-2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id="login-password-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function LoginSubmitButton({
  isSubmitting,
  authLoading,
}: {
  isSubmitting: boolean;
  authLoading: boolean;
}) {
  return (
    <Button
      type="submit"
      data-testid="login-submit"
      variant="default"
      className="h-12 w-full text-base font-semibold"
      disabled={isSubmitting || authLoading}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Entrando...
        </>
      ) : (
        'Entrar'
      )}
    </Button>
  );
}

function LoginForm({
  credentials,
  fieldErrors,
  showPassword,
  isSubmitting,
  authLoading,
  emailInputRef,
  onSubmit,
  onCredentialChange,
  onTogglePassword,
  onForgotPassword,
}: {
  credentials: LoginCredentials;
  fieldErrors: LoginFieldErrors;
  showPassword: boolean;
  isSubmitting: boolean;
  authLoading: boolean;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCredentialChange: (field: keyof LoginCredentials, value: string) => void;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
      aria-busy={isSubmitting || authLoading}
      data-testid="login-form"
    >
      <LoginEmailField
        credentials={credentials}
        error={fieldErrors.email}
        inputRef={emailInputRef}
        onChange={onCredentialChange}
      />
      <LoginPasswordField
        credentials={credentials}
        error={fieldErrors.password}
        showPassword={showPassword}
        onChange={onCredentialChange}
        onToggleVisibility={onTogglePassword}
      />
      <div className="flex items-center justify-end">
        <Button
          type="button"
          data-testid="login-forgot-link"
          variant="link"
          className="min-h-11 px-0 text-sm text-primary hover:text-primary/80"
          onClick={onForgotPassword}
        >
          Esqueci minha senha
        </Button>
      </div>
      <LoginSubmitButton isSubmitting={isSubmitting} authLoading={authLoading} />
      {import.meta.env.DEV && (
        <div className="border-t border-border pt-5 text-center">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Quer avaliar a experiência antes de conectar o ambiente?
          </p>
          <Button
            asChild
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full whitespace-normal border-[#007A70]/35 py-2 text-center leading-tight text-[#005E55] hover:bg-[#EAF8F6]"
          >
            <Link to="/loja-demo">Explorar loja demonstrativa</Link>
          </Button>
        </div>
      )}
    </form>
  );
}

function AuthenticationCard({
  ipBlocked,
  showForgotPassword,
  socialError,
  credentials,
  fieldErrors,
  showPassword,
  isSubmitting,
  authLoading,
  emailInputRef,
  onBackFromForgot,
  onUseEmail,
  onDismissSocialError,
  onSubmit,
  onCredentialChange,
  onTogglePassword,
  onForgotPassword,
}: {
  ipBlocked: boolean;
  showForgotPassword: boolean;
  socialError: string | null;
  credentials: LoginCredentials;
  fieldErrors: LoginFieldErrors;
  showPassword: boolean;
  isSubmitting: boolean;
  authLoading: boolean;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  onBackFromForgot: () => void;
  onUseEmail: () => void;
  onDismissSocialError: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCredentialChange: (field: keyof LoginCredentials, value: string) => void;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
}) {
  const blockedClass = ipBlocked ? 'opacity-50 pointer-events-none' : '';
  return (
    <Card className={`border-border/70 bg-card shadow-sm ${blockedClass}`}>
      {showForgotPassword ? (
        <CardContent className="pb-6 pt-6">
          <Suspense
            fallback={
              <div
                className="min-h-40"
                role="status"
                aria-label="Carregando recuperação de senha"
              />
            }
          >
            <ForgotPasswordForm onBack={onBackFromForgot} />
          </Suspense>
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-4">
            <div className="space-y-1 text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Acesse seu portal
              </h1>
              <p className="text-sm text-muted-foreground">
                Use seu e-mail de trabalho e sua senha.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <SocialErrorBanner
              message={socialError}
              onUseEmail={onUseEmail}
              onDismiss={onDismissSocialError}
            />
            <LoginForm
              credentials={credentials}
              fieldErrors={fieldErrors}
              showPassword={showPassword}
              isSubmitting={isSubmitting}
              authLoading={authLoading}
              emailInputRef={emailInputRef}
              onSubmit={onSubmit}
              onCredentialChange={onCredentialChange}
              onTogglePassword={onTogglePassword}
              onForgotPassword={onForgotPassword}
            />
          </CardContent>
        </>
      )}
    </Card>
  );
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
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Exibe uma mensagem controlada para falhas SSO e remove os parâmetros para
  // que dados fornecidos pela URL nunca sejam refletidos nem persistam.
  useEffect(() => {
    const reason = searchParams.get(SSO_ERROR_QUERY_PARAM);
    const hasLegacyError = searchParams.has('error');
    const message = getSsoFailureMessage(reason, hasLegacyError);
    if (message) {
      setSocialError(message);
      const next = new URLSearchParams(searchParams);
      next.delete(SSO_ERROR_QUERY_PARAM);
      next.delete('error');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const focusEmailFallback = useCallback(() => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Só redireciona após carregar papéis e encerrar a validação da entrada.
  useAuthenticatedRedirect({
    hasUser: Boolean(user),
    authLoading,
    rolesLoaded,
    role,
    isSubmitting,
    ipBlocked,
    searchParams,
    location,
    navigate,
  });

  const handleLogin = async (data: LoginCredentials) => {
    void import('@/lib/diagnostics').then(({ diagnostics }) => {
      diagnostics.log('info', 'Auth', 'Iniciando autenticação');
    });
    setIsSubmitting(true);

    setIpBlocked(false);

    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        void import('@/lib/diagnostics').then(({ diagnostics }) => {
          diagnostics.log('error', 'Auth', `Erro no signIn: ${error.message}`);
        });
        await logLoginAttempt(data.email, null, false, error.message);
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: error.message.includes('Invalid login credentials')
            ? 'Email ou senha incorretos'
            : error.message,
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      void import('@/lib/diagnostics').then(({ diagnostics }) => {
        diagnostics.log('info', 'Auth', 'Validando restrições de acesso');
      });
      const block = await checkAuthenticatedAccess({
        userId,
        email: data.email,
        validateIPForAuthenticatedUser,
        logLoginAttempt,
        signOut,
      });
      if (block) {
        setIpBlocked(true);
        setBlockedIP(block.currentIP);
        toast({
          variant: 'destructive',
          title: 'Acesso Bloqueado',
          description: block.message,
          duration: 10000,
        });
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });

      // The useEffect for [user, role] will handle the automatic redirection
      // once the AuthContext updates the role after signIn.
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
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
    setCredentials((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  return (
    <main
      className="auth-entry-shell flex min-h-screen bg-[#F7FAFA] dark:bg-background"
      role="main"
      aria-label="Autenticação"
    >
      <PageSEO
        title="Login"
        description="Acesse o Portal de Compras Sicoob. Faça login para gerenciar seus orçamentos e produtos."
        path="/login"
        noIndex
      />
      {/* Left side - Branding */}
      <AuthBrandingPanel />

      {/* Right side - Auth Form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="space-y-3 text-center lg:hidden">
            <div className="mx-auto inline-flex items-center justify-center rounded-xl bg-[#003641] px-6 py-4">
              <img
                src="/brand/sicoob-logo.png"
                alt="Sicoob"
                width={180}
                height={40}
                className="h-auto w-44 object-contain"
              />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">Portal de brindes</p>
              <p className="text-sm text-muted-foreground">Portal de Compras</p>
            </div>
          </div>

          <BlockedIpAlert
            blocked={ipBlocked}
            ip={blockedIP}
            onRetry={() => {
              setIpBlocked(false);
              setBlockedIP(null);
            }}
          />
          <AuthenticationCard
            ipBlocked={ipBlocked}
            showForgotPassword={showForgotPassword}
            socialError={socialError}
            credentials={credentials}
            fieldErrors={fieldErrors}
            showPassword={showPassword}
            isSubmitting={isSubmitting}
            authLoading={authLoading}
            emailInputRef={emailInputRef}
            onBackFromForgot={() => setShowForgotPassword(false)}
            onUseEmail={focusEmailFallback}
            onDismissSocialError={() => setSocialError(null)}
            onSubmit={handleLoginSubmit}
            onCredentialChange={updateCredential}
            onTogglePassword={() => setShowPassword((current) => !current)}
            onForgotPassword={() => setShowForgotPassword(true)}
          />

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
