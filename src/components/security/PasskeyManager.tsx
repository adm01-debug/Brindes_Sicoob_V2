import { useState, useEffect } from "react";
import { Fingerprint, Trash2, Plus, Smartphone, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PasskeyManagerProps {
  targetUserId?: string;
}

export function PasskeyManager({ targetUserId }: PasskeyManagerProps) {
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

  const getDeviceIcon = (deviceName: string | null) => {
    if (!deviceName) return <Fingerprint className="h-5 w-5" />;
    if (deviceName.includes("iOS") || deviceName.includes("Android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys / Biometria
          </CardTitle>
          <CardDescription>
            {isManagingOther
              ? 'Passkeys registradas deste usuário'
              : 'Login biométrico usando Face ID, Touch ID ou Windows Hello'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="p-2 rounded-full bg-muted">
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-orange" />
              Passkeys / Biometria
            </CardTitle>
            <CardDescription>
              {isManagingOther
                ? 'Passkeys registradas deste usuário'
                : 'Login rápido e seguro usando Face ID, Touch ID ou Windows Hello'}
            </CardDescription>
          </div>
          <Badge variant={passkeys.length > 0 ? "default" : "secondary"} className={passkeys.length > 0 ? "bg-success" : ""}>
            {passkeys.length} {passkeys.length === 1 ? "registrada" : "registradas"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform authenticator status - only show for own account */}
        {!isManagingOther && !hasPlatformAuth && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="p-2 rounded-full bg-warning/20">
              <Fingerprint className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Autenticador não detectado</p>
              <p className="text-sm text-muted-foreground">
                Seu dispositivo não possui autenticador biométrico disponível
              </p>
            </div>
          </div>
        )}

        {/* Registered passkeys list */}
        {passkeys.length > 0 && (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border hover:border-orange/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange/10">
                    {getDeviceIcon(passkey.device_name)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {passkey.device_name || "Dispositivo desconhecido"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Registrado{" "}
                      {formatDistanceToNow(new Date(passkey.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                      {passkey.last_used_at && (
                        <>
                          {" • "}Último uso{" "}
                          {formatDistanceToNow(new Date(passkey.last_used_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon" aria-label="Carregando"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingId === passkey.id}
                    >
                      {deletingId === passkey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isManagingOther
                          ? 'Este usuário não poderá mais usar este dispositivo para login biométrico.'
                          : 'Você não poderá mais usar este dispositivo para fazer login biométrico.'}
                        {' '}Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(passkey.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {passkeys.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nenhuma passkey registrada</p>
              <p className="text-sm text-muted-foreground">
                {isManagingOther
                  ? 'Este usuário não possui passkeys registradas'
                  : 'Adicione uma passkey para fazer login mais rápido'}
              </p>
            </div>
          </div>
        )}

        {/* Register button - only for own account */}
        {!isManagingOther && hasPlatformAuth && (
          <Button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full gap-2 bg-orange hover:bg-orange/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar Passkey
          </Button>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          Passkeys são armazenadas de forma segura no dispositivo e usam biometria
          (Face ID, Touch ID) ou PIN para autenticação.
        </p>
      </CardContent>
    </Card>
  );
}
