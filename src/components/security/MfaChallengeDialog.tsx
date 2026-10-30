/**
 * MfaChallengeDialog — pede código TOTP para elevar sessão para AAL2.
 * Usado no AdminRoute quando admin/manager já tem MFA mas a sessão atual está em aal1.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
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

interface MfaChallengeDialogProps {
  open: boolean;
}

interface ChallengeContentProps {
  code: string;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onSignOut: () => void;
  onVerify: () => void;
}

function ChallengeContent({
  code,
  loading,
  onCodeChange,
  onSignOut,
  onVerify,
}: ChallengeContentProps) {
  return (
    <div className="space-y-4">
      <Input
        value={code}
        aria-label="Código de autenticação em duas etapas"
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
        autoFocus
        inputMode="numeric"
        onKeyDown={(event) => event.key === 'Enter' && code.length === 6 && onVerify()}
      />
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSignOut}>
          Sair
        </Button>
        <Button onClick={onVerify} disabled={loading || code.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verificar
        </Button>
      </div>
    </div>
  );
}

export function MfaChallengeDialog({ open }: MfaChallengeDialogProps) {
  const challenge = useMfaChallenge(open);
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* não permite fechar sem verificar */
      }}
    >
      <DialogContent
        className="z-[120] max-w-md"
        overlayClassName="z-[110]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verificação em duas etapas
          </DialogTitle>
          <DialogDescription>
            Para acessar a área administrativa, digite o código do seu app autenticador.
          </DialogDescription>
        </DialogHeader>
        <ChallengeContent {...challenge} />
      </DialogContent>
    </Dialog>
  );
}

function useMfaChallenge(open: boolean): ChallengeContentProps {
  const { refreshAAL, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const factorId = useMfaFactorId(open);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) setCode('');
  }, [open]);

  async function verify() {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      await refreshAAL();
      toast.success('Acesso administrativo liberado');
    } catch (e) {
      toast.error('Código inválido', {
        description: e instanceof Error ? e.message : 'Tente novamente',
      });
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return {
    code,
    loading,
    onCodeChange: setCode,
    onSignOut: handleSignOut,
    onVerify: verify,
  };
}

function useMfaFactorId(open: boolean) {
  const [factorId, setFactorId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setFactorId(null);
      return;
    }
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((factor) => factor.status === 'verified');
      setFactorId(verified?.id ?? null);
    });
  }, [open]);
  return factorId;
}
