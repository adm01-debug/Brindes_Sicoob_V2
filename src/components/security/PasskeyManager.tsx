import { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Plus, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PasskeyManagerProps {
  targetUserId?: string;
}

type Passkey = ReturnType<typeof useWebAuthn>['passkeys'][number];

function getDeviceIcon(deviceName: string | null) {
  if (!deviceName) return <Fingerprint className="h-5 w-5" />;
  if (deviceName.includes('iOS') || deviceName.includes('Android'))
    return <Smartphone className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
}

function UnsupportedPasskeyCard({ managingOther }: { managingOther: boolean }) {
  const description = managingOther
    ? 'Passkeys registradas deste usuário'
    : 'Login biométrico usando Face ID, Touch ID ou Windows Hello';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Passkeys / Biometria
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <div className="rounded-full bg-muted p-2">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Indisponível por enquanto</p>
            <p className="text-sm text-muted-foreground">
              O login com passkey aguarda validação segura no servidor.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PasskeyHeader({ managingOther, count }: { managingOther: boolean; count: number }) {
  const description = managingOther
    ? 'Passkeys registradas deste usuário'
    : 'Login rápido e seguro usando Face ID, Touch ID ou Windows Hello';
  const badgeClass = count > 0 ? 'bg-success' : '';
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-orange" />
            Passkeys / Biometria
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant={count > 0 ? 'default' : 'secondary'} className={badgeClass}>
          {count} {count === 1 ? 'registrada' : 'registradas'}
        </Badge>
      </div>
    </CardHeader>
  );
}

function PasskeyRow({
  passkey,
  managingOther,
  deleting,
  onDelete,
}: {
  passkey: Passkey;
  managingOther: boolean;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:border-orange/30">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-orange/10 p-2">{getDeviceIcon(passkey.device_name)}</div>
        <div>
          <p className="font-medium text-foreground">
            {passkey.device_name || 'Dispositivo desconhecido'}
          </p>
          <p className="text-sm text-muted-foreground">
            Registrado{' '}
            {formatDistanceToNow(new Date(passkey.created_at), { addSuffix: true, locale: ptBR })}
            {passkey.last_used_at && (
              <>
                {' '}
                {' • '}Último uso{' '}
                {formatDistanceToNow(new Date(passkey.last_used_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </>
            )}
          </p>
        </div>
      </div>
      <PasskeyDeleteDialog
        passkeyId={passkey.id}
        managingOther={managingOther}
        deleting={deleting}
        onDelete={onDelete}
      />
    </div>
  );
}

function PasskeyDeleteDialog({
  passkeyId,
  managingOther,
  deleting,
  onDelete,
}: {
  passkeyId: string;
  managingOther: boolean;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  const description = managingOther
    ? 'Este usuário não poderá mais usar este dispositivo para login biométrico.'
    : 'Você não poderá mais usar este dispositivo para fazer login biométrico.';
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remover passkey"
          className="text-muted-foreground hover:text-destructive"
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover passkey?</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(passkeyId)}
            className="bg-destructive hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PasskeysList({
  passkeys,
  managingOther,
  deletingId,
  onDelete,
}: {
  passkeys: Passkey[];
  managingOther: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  if (passkeys.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Fingerprint className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">Nenhuma passkey registrada</p>
          <p className="text-sm text-muted-foreground">
            {managingOther
              ? 'Este usuário não possui passkeys registradas'
              : 'Adicione uma passkey para fazer login mais rápido'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {passkeys.map((passkey) => (
        <PasskeyRow
          key={passkey.id}
          passkey={passkey}
          managingOther={managingOther}
          deleting={deletingId === passkey.id}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function PlatformWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <div className="rounded-full bg-warning/20 p-2">
        <Fingerprint className="h-5 w-5 text-warning" />
      </div>
      <div>
        <p className="font-medium text-foreground">Autenticador não detectado</p>
        <p className="text-sm text-muted-foreground">
          Seu dispositivo não possui autenticador biométrico disponível
        </p>
      </div>
    </div>
  );
}

function RegisterPasskeyButton({
  visible,
  loading,
  onRegister,
}: {
  visible: boolean;
  loading: boolean;
  onRegister: () => void;
}) {
  if (!visible) return null;
  return (
    <Button
      onClick={onRegister}
      disabled={loading}
      className="w-full gap-2 bg-orange hover:bg-orange/90"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Adicionar Passkey
    </Button>
  );
}

export function PasskeyManager({ targetUserId }: PasskeyManagerProps) {
  const manager = usePasskeyManager(targetUserId);
  if (!manager.isSupported) {
    return <UnsupportedPasskeyCard managingOther={manager.isManagingOther} />;
  }
  return (
    <Card>
      <PasskeyHeader managingOther={manager.isManagingOther} count={manager.passkeys.length} />
      <CardContent className="space-y-4">
        <PlatformWarning visible={!manager.isManagingOther && !manager.hasPlatformAuth} />
        <PasskeysList
          passkeys={manager.passkeys}
          managingOther={manager.isManagingOther}
          deletingId={manager.deletingId}
          onDelete={manager.handleDelete}
        />
        <RegisterPasskeyButton
          visible={!manager.isManagingOther && manager.hasPlatformAuth}
          loading={manager.isLoading}
          onRegister={manager.handleRegister}
        />
        <p className="text-center text-xs text-muted-foreground">
          Passkeys são armazenadas de forma segura no dispositivo e usam biometria (Face ID, Touch
          ID) ou PIN para autenticação.
        </p>
      </CardContent>
    </Card>
  );
}

function usePasskeyManager(targetUserId?: string) {
  const { user } = useAuth();
  const effectiveUserId = targetUserId || user?.id;
  const isManagingOther = !!targetUserId && targetUserId !== user?.id;

  const {
    isSupported,
    isLoading,
    passkeys,
    fetchPasskeys,
    registerPasskey,
    deletePasskey,
    checkPlatformAuthenticator,
  } = useWebAuthn();
  const [hasPlatformAuth, setHasPlatformAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveUserId) {
      fetchPasskeys(effectiveUserId);
    }
    checkPlatformAuthenticator().then(setHasPlatformAuth);
  }, [effectiveUserId, fetchPasskeys, checkPlatformAuthenticator]);

  const handleRegister = async () => {
    if (user?.id && user?.email) {
      await registerPasskey(user.id, user.email);
    }
  };

  const handleDelete = async (passkeyId: string) => {
    setDeletingId(passkeyId);
    await deletePasskey(passkeyId);
    setDeletingId(null);
  };

  return {
    isSupported,
    isLoading,
    passkeys,
    hasPlatformAuth,
    deletingId,
    isManagingOther,
    handleRegister,
    handleDelete,
  };
}
