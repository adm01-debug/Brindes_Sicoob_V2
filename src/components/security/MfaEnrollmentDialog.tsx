/**
 * MfaEnrollmentDialog — fluxo de setup TOTP em 3 passos:
 *  1. Enroll → recebe QR code
 *  2. Usuário escaneia no app autenticador (Google Authenticator, 1Password, etc.)
 *  3. Usuário insere código de 6 dígitos para verificar e ativar
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface MfaEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando true, fechar diálogo desloga o usuário (uso em gate de admin) */
  enforce?: boolean;
  redirectOnSuccess?: boolean;
}

type EnrollmentStep = 'intro' | 'qr' | 'verify';

interface EnrollmentContentProps {
  step: EnrollmentStep;
  enforce: boolean;
  loading: boolean;
  qrCode: string | null;
  secret: string | null;
  code: string;
  onClose: () => void;
  onStart: () => void;
  onStepChange: (step: EnrollmentStep) => void;
  onCodeChange: (code: string) => void;
  onVerify: () => void;
}

function EnrollmentContent({
  step,
  enforce,
  loading,
  qrCode,
  secret,
  code,
  onClose,
  onStart,
  onStepChange,
  onCodeChange,
  onVerify,
}: EnrollmentContentProps) {
  if (step === 'intro')
    return (
      <EnrollmentIntro enforce={enforce} loading={loading} onClose={onClose} onStart={onStart} />
    );
  if (step === 'qr' && qrCode)
    return (
      <EnrollmentQr qrCode={qrCode} secret={secret} onContinue={() => onStepChange('verify')} />
    );
  if (step === 'verify')
    return (
      <EnrollmentVerification
        code={code}
        loading={loading}
        onCodeChange={onCodeChange}
        onBack={() => onStepChange('qr')}
        onVerify={onVerify}
      />
    );
  return null;
}

function EnrollmentIntro({
  enforce,
  loading,
  onClose,
  onStart,
}: Pick<EnrollmentContentProps, 'enforce' | 'loading' | 'onClose' | 'onStart'>) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Você vai precisar de um app autenticador</p>
            <p className="text-muted-foreground">
              Google Authenticator, 1Password, Authy ou similar.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {!enforce && (
          <Button variant="ghost" onClick={onClose}>
            Agora não
          </Button>
        )}
        <Button onClick={onStart} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Começar
        </Button>
      </div>
    </div>
  );
}

function EnrollmentQr({
  qrCode,
  secret,
  onContinue,
}: {
  qrCode: string;
  secret: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Escaneie o QR code no seu app autenticador:</p>
      <div className="flex justify-center rounded-lg border bg-white p-4">
        <img src={qrCode} alt="QR code MFA" className="h-48 w-48" />
      </div>
      {secret && (
        <div className="text-center text-xs text-muted-foreground">
          Ou digite manualmente:{' '}
          <code className="rounded bg-muted px-2 py-0.5 font-mono">{secret}</code>
        </div>
      )}
      <Button onClick={onContinue} className="w-full">
        Já escaneei, continuar
      </Button>
    </div>
  );
}

function EnrollmentVerification({
  code,
  loading,
  onCodeChange,
  onBack,
  onVerify,
}: {
  code: string;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onBack: () => void;
  onVerify: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Digite o código de 6 dígitos do seu app:</p>
      <Input
        value={code}
        aria-label="Código de autenticação para ativar duas etapas"
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
        autoFocus
        inputMode="numeric"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onVerify} disabled={loading || code.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verificar e ativar
        </Button>
      </div>
    </div>
  );
}

export function MfaEnrollmentDialog({
  open,
  onOpenChange,
  enforce = false,
  redirectOnSuccess = true,
}: MfaEnrollmentDialogProps) {
  const enrollment = useMfaEnrollment({ open, onOpenChange, enforce, redirectOnSuccess });
  return (
    <Dialog open={open} onOpenChange={enrollment.handleClose}>
      <DialogContent className="z-[120] max-w-md" overlayClassName="z-[110]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Autenticação em duas etapas
          </DialogTitle>
          <DialogDescription>
            {enforce
              ? 'Por segurança, contas com acesso administrativo precisam ter MFA ativado.'
              : 'Adicione uma camada extra de proteção à sua conta.'}
          </DialogDescription>
        </DialogHeader>
        <EnrollmentContent {...enrollment.contentProps} />
      </DialogContent>
    </Dialog>
  );
}

function useMfaEnrollment({
  open,
  onOpenChange,
  enforce = false,
  redirectOnSuccess = true,
}: MfaEnrollmentDialogProps) {
  const state = useEnrollmentState(open);
  const startEnroll = useStartEnrollment(state);
  const verifyCode = useVerifyEnrollment(state, { onOpenChange, redirectOnSuccess });
  const handleClose = useEnrollmentClose({ onOpenChange, enforce });

  return {
    handleClose,
    contentProps: {
      step: state.step,
      enforce,
      loading: state.loading,
      qrCode: state.qrCode,
      secret: state.secret,
      code: state.code,
      onClose: () => handleClose(false),
      onStart: startEnroll,
      onStepChange: state.setStep,
      onCodeChange: state.setCode,
      onVerify: verifyCode,
    },
  };
}

type EnrollmentState = ReturnType<typeof useEnrollmentState>;

function useStartEnrollment(state: EnrollmentState) {
  return async () => {
    state.setLoading(true);
    try {
      const factor = await enrollTotp();
      state.setFactorId(factor.id);
      state.setQrCode(factor.qrCode);
      state.setSecret(factor.secret);
      state.setStep('qr');
    } catch (error) {
      toast.error('Falha ao iniciar MFA', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      state.setLoading(false);
    }
  };
}

function useVerifyEnrollment(
  state: EnrollmentState,
  options: Pick<MfaEnrollmentDialogProps, 'onOpenChange' | 'redirectOnSuccess'>,
) {
  const { refreshAAL } = useAuth();
  const navigate = useNavigate();
  return async () => {
    if (!state.factorId || state.code.length !== 6) return;
    state.setLoading(true);
    try {
      await verifyTotp(state.factorId, state.code);
      toast.success('MFA ativado com sucesso!', {
        description: 'A partir de agora seu acesso administrativo está protegido.',
      });
      await refreshAAL();
      options.onOpenChange(false);
      if (options.redirectOnSuccess) navigate('/admin', { replace: true });
    } catch (error) {
      toast.error('Código inválido', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
      state.setCode('');
    } finally {
      state.setLoading(false);
    }
  };
}

function useEnrollmentClose(options: Pick<MfaEnrollmentDialogProps, 'onOpenChange' | 'enforce'>) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async (next: boolean) => {
    if (!next && options.enforce) {
      await signOut();
      navigate('/login', { replace: true });
      return;
    }
    options.onOpenChange(next);
  };
}

function useEnrollmentState(open: boolean) {
  const [step, setStep] = useState<EnrollmentStep>('intro');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open) return;
    setStep('intro');
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode('');
    setLoading(false);
  }, [open]);
  return {
    step,
    setStep,
    factorId,
    setFactorId,
    qrCode,
    setQrCode,
    secret,
    setSecret,
    code,
    setCode,
    loading,
    setLoading,
  };
}

async function enrollTotp() {
  const { data: existing } = await supabase.auth.mfa.listFactors();
  const stale = existing?.all?.find(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
  );
  if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Brindes Sicoob · ${new Date().toLocaleDateString('pt-BR')}`,
  });
  if (error) throw error;
  return { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

async function verifyTotp(factorId: string, code: string) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (error) throw error;
}
