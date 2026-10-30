import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, Sparkles } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PageSEO } from '@/components/seo/PageSEO';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter letra maiúscula')
      .regex(/[a-z]/, 'Senha deve conter letra minúscula')
      .regex(/[0-9]/, 'Senha deve conter número')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Senha deve conter caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function useRecoveryToken() {
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasRecoveryToken =
        Boolean(hashParams.get('access_token')) && hashParams.get('type') === 'recovery';
      setIsValidToken(Boolean(session) || hasRecoveryToken);
      setIsCheckingToken(false);
    };
    void checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidToken(true);
        setIsCheckingToken(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return { isCheckingToken, isValidToken };
}

function usePasswordSubmission() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setSubmitError(
          'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.',
        );
        toast({
          variant: 'destructive',
          title: 'Erro ao redefinir senha',
          description: error.message,
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso.',
      });
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch {
      setSubmitError('Não foi possível redefinir a senha. Tente novamente mais tarde.');
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, isSuccess, submitError };
}

function LoadingTokenView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PageSEO
        title="Redefinir Senha"
        description="Redefina sua senha de acesso à plataforma Brindes Sicoob."
        path="/reset-password"
      />
      <Loader2 className="h-8 w-8 animate-spin text-orange" />
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: 'error' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const isSuccess = icon === 'success';
  const Icon = isSuccess ? CheckCircle : Lock;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardContent className="space-y-4 pb-8 pt-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isSuccess ? 'bg-success/10' : 'bg-destructive/10'}`}
          >
            <Icon className={`h-8 w-8 ${isSuccess ? 'text-success' : 'text-destructive'}`} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="orange" className="w-full" onClick={onAction}>
            {actionLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordInput({
  form,
  showPassword,
  toggleVisibility,
}: {
  form: UseFormReturn<ResetPasswordFormData>;
  showPassword: boolean;
  toggleVisibility: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password" className="text-foreground">
        Nova senha
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          className="border-border bg-input pl-10 pr-10 focus:border-orange focus:ring-orange"
          {...form.register('password')}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-orange"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {form.formState.errors.password && (
        <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
      )}
      <PasswordStrengthIndicator password={form.watch('password')} />
    </div>
  );
}

function ConfirmPasswordInput({
  form,
  showPassword,
}: {
  form: UseFormReturn<ResetPasswordFormData>;
  showPassword: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="confirmPassword" className="text-foreground">
        Confirmar nova senha
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          className="border-border bg-input pl-10 focus:border-orange focus:ring-orange"
          {...form.register('confirmPassword')}
        />
      </div>
      {form.formState.errors.confirmPassword && (
        <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
      )}
    </div>
  );
}

function ResetFormCard({
  form,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  form: UseFormReturn<ResetPasswordFormData>;
  onSubmit: (data: ResetPasswordFormData) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Card className="border-border bg-card shadow-xl">
      <CardHeader className="pb-4">
        <div className="space-y-1 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">Redefinir senha</h2>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <PasswordInput
            form={form}
            showPassword={showPassword}
            toggleVisibility={() => setShowPassword((visible) => !visible)}
          />
          <ConfirmPasswordInput form={form} showPassword={showPassword} />
          <Button
            type="submit"
            variant="orange"
            className="h-11 w-full text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redefinindo...
              </>
            ) : (
              'Redefinir senha'
            )}
          </Button>
          {submitError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ResetFormView({
  form,
  onSubmit,
  isSubmitting,
  submitError,
}: Parameters<typeof ResetFormCard>[0]) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-fade-in space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-orange shadow-lg shadow-orange/30">
            <Sparkles className="h-8 w-8 text-orange-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Brindes Sicoob</h1>
        </div>
        <ResetFormCard
          form={form}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { isCheckingToken, isValidToken } = useRecoveryToken();
  const { handleSubmit, isSubmitting, isSuccess, submitError } = usePasswordSubmission();
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (isCheckingToken) return <LoadingTokenView />;
  if (!isValidToken)
    return (
      <StatusCard
        icon="error"
        title="Link inválido ou expirado"
        description="Este link de recuperação de senha não é mais válido. Por favor, solicite um novo link."
        actionLabel="Voltar ao login"
        onAction={() => navigate('/login')}
      />
    );
  if (isSuccess)
    return (
      <StatusCard
        icon="success"
        title="Senha redefinida!"
        description="Sua senha foi alterada com sucesso. Você será redirecionado automaticamente..."
        actionLabel="Ir para o início"
        onAction={() => navigate('/')}
      />
    );
  return (
    <ResetFormView
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );
}
