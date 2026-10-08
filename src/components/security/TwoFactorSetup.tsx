import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MfaEnrollmentDialog } from '@/components/security/MfaEnrollmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { use2FA } from '@/hooks/use2FA';

interface TwoFactorSetupProps {
  targetUserId?: string;
  targetUserEmail?: string;
}

export function TwoFactorSetup({ targetUserId }: TwoFactorSetupProps) {
  const { user } = useAuth();
  const isManagingOther = !!targetUserId && targetUserId !== user?.id;
  const { is2FAEnabled, isLoading, error, refetch } = use2FA(targetUserId);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const disable = useMfaDisable(refetch);

  if (isManagingOther) return <ManagedUserMfaNotice />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {is2FAEnabled ? (
            <ShieldCheck className="h-5 w-5 text-success" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
          Autenticação em duas etapas
        </CardTitle>
        <CardDescription>Proteja sua conta com um aplicativo autenticador.</CardDescription>
      </CardHeader>
      <MfaStatusContent
        isLoading={isLoading}
        error={error}
        enabled={is2FAEnabled}
        onRetry={() => void refetch()}
        onEnroll={() => setEnrollOpen(true)}
        onDisable={() => disable.setOpen(true)}
      />
      <MfaEnrollmentDialog
        open={enrollOpen}
        onOpenChange={(open) => {
          setEnrollOpen(open);
          if (!open) void refetch();
        }}
        redirectOnSuccess={false}
      />
      <DisableMfaDialog {...disable} />
    </Card>
  );
}

function ManagedUserMfaNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticação em duas etapas</CardTitle>
        <CardDescription>
          Por segurança, cada usuário configura ou remove seus próprios fatores na própria conta.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface MfaStatusContentProps {
  isLoading: boolean;
  error: string | null;
  enabled: boolean;
  onRetry: () => void;
  onEnroll: () => void;
  onDisable: () => void;
}

function MfaStatusContent({
  isLoading,
  error,
  enabled,
  onRetry,
  onEnroll,
  onDisable,
}: MfaStatusContentProps) {
  if (isLoading)
    return (
      <CardContent>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    );
  if (error)
    return (
      <CardContent>
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            Não foi possível consultar o MFA: {error}
          </p>
          <Button variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </CardContent>
    );
  return (
    <CardContent>
      {enabled ? (
        <div className="space-y-4">
          <p className="text-sm text-success">Seu fator TOTP está ativo.</p>
          <Button variant="outline" className="text-destructive" onClick={onDisable}>
            <ShieldOff className="mr-2 h-4 w-4" />
            Desativar MFA
          </Button>
        </div>
      ) : (
        <Button onClick={onEnroll}>
          <Shield className="mr-2 h-4 w-4" />
          Configurar MFA
        </Button>
      )}
    </CardContent>
  );
}

function useMfaDisable(refetch: () => Promise<unknown>) {
  const { refreshAAL } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setCode('');
  };
  const onDisable = async () => {
    if (code.length !== 6) return;
    setIsSubmitting(true);
    try {
      await disableMfaFactor(code);
      await refreshAAL();
      await refetch();
      setOpen(false);
      setCode('');
      toast.success('Autenticação em duas etapas desativada.');
    } catch (error) {
      toast.error('Não foi possível desativar o MFA.', {
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return { open, setOpen, code, setCode, isSubmitting, onOpenChange, onDisable };
}

async function disableMfaFactor(code: string) {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw listError;
  const factor = factors.totp.find((item) => item.status === 'verified');
  if (!factor) throw new Error('Nenhum fator TOTP ativo foi encontrado.');
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (error) throw error;
}

function DisableMfaDialog({
  open,
  code,
  setCode,
  isSubmitting,
  onOpenChange,
  onDisable,
}: ReturnType<typeof useMfaDisable>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar MFA</DialogTitle>
          <DialogDescription>
            Digite o código atual do seu aplicativo autenticador para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Código de verificação"
          placeholder="000000"
          className="text-center font-mono text-xl tracking-[0.4em]"
        />
        <Button
          variant="destructive"
          disabled={code.length !== 6 || isSubmitting}
          onClick={onDisable}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar desativação
        </Button>
      </DialogContent>
    </Dialog>
  );
}
