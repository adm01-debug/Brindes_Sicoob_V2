import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { inscricaoAtiva } from '@/lib/push-subscription';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

const TEST_NOTIFICATION_TITLE = 'Teste de notificação';
const TEST_NOTIFICATION_BODY = 'Esta é uma notificação de teste do sistema de segurança.';

export function PushNotificationSettings({ managingOther = false }: { managingOther?: boolean }) {
  const settings = usePushNotificationSettings();
  if (!settings.isSupported) return <UnsupportedPushCard />;
  return (
    <Card>
      <PushHeader enabled={settings.isEnabled} />
      <CardContent className="space-y-6">
        {managingOther && (
          <div className="flex items-start gap-3 rounded-lg border border-orange/30 bg-orange/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange" />
            <p className="text-sm">
              A inscrição de push vale <strong>somente para o seu próprio dispositivo</strong>.
              As ações abaixo alteram a sua conta, não a do usuário que você está gerenciando.
            </p>
          </div>
        )}
        <PushStatus {...settings} />
        {settings.permission === 'denied' && <PermissionDeniedNotice />}
        {settings.isEnabled && (
          <EnabledNotificationSettings onTest={settings.handleTestNotification} />
        )}
      </CardContent>
    </Card>
  );
}

function usePushNotificationSettings() {
  const {
    push: { isSupported, isEnabled, permission, requestPermission, showSecurityAlert, removerInscricao, inscricao },
  } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [inscrito, setInscrito] = useState(false);

  const sincronizarInscricao = useCallback(() => {
    if (!user) return;
    void inscricaoAtiva(user.id).then(setInscrito);
  }, [user]);

  useEffect(() => {
    if (permission === 'granted') sincronizarInscricao();
    else setInscrito(false);
  }, [permission, sincronizarInscricao]);

  // Após uma tentativa de inscrição, o estado do hook manda: falha de gravação
  // não pode aparecer como "inscrito" só porque o navegador tem a subscription.
  useEffect(() => {
    if (inscricao === 'ativa') setInscrito(true);
    if (inscricao === 'inativa' || inscricao === 'falhou') setInscrito(false);
  }, [inscricao]);

  const handleDisableNotifications = async () => {
    setIsRequesting(true);
    try {
      const ok = await removerInscricao();
      setInscrito(false);
      toast({
        title: ok ? 'Inscrição removida' : 'Não foi possível remover',
        description: ok
          ? 'Este dispositivo deixou de receber notificações com o app fechado.'
          : 'Tente novamente ou revise as permissões do navegador.',
        variant: ok ? 'default' : 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        sincronizarInscricao();
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá alertas de segurança em tempo real.',
        });
        // Show test notification
        setTimeout(() => {
          showSecurityAlert(
            'Configuração concluída',
            'As notificações de segurança estão ativas!',
            'info',
          );
        }, 1000);
      } else {
        toast({
          title: 'Permissão negada',
          description: 'Você pode ativar as notificações nas configurações do navegador.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = () =>
    showSecurityAlert(TEST_NOTIFICATION_TITLE, TEST_NOTIFICATION_BODY, 'info');

  return {
    isSupported,
    isEnabled,
    permission,
    isRequesting,
    inscrito,
    handleEnableNotifications,
    handleDisableNotifications,
    handleTestNotification,
  };
}

function UnsupportedPushCard() {
  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          Notificações Push
        </CardTitle>
        <CardDescription>Seu navegador não suporta notificações push.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <AlertTriangle className="h-5 w-5 text-orange" />
          <div>
            <p className="text-sm font-medium">Navegador não compatível</p>
            <p className="text-xs text-muted-foreground">
              Tente usar Chrome, Firefox, Edge ou Safari para receber notificações.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PushHeader({ enabled }: { enabled: boolean }) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Notificações Push
        {enabled && (
          <Badge variant="default" className="ml-2">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ativo
          </Badge>
        )}
      </CardTitle>
      <CardDescription>Receba alertas de segurança em tempo real no seu navegador.</CardDescription>
    </CardHeader>
  );
}

type AcaoStatus = {
  isEnabled: boolean;
  inscrito: boolean;
  isRequesting: boolean;
  onEnable: () => void;
  onDisable: () => void;
};

function descricaoStatus(isEnabled: boolean, inscrito: boolean): string {
  if (!isEnabled) return 'Ative para receber alertas importantes';
  if (inscrito) return 'Este dispositivo recebe alertas mesmo com o app fechado';
  return 'Permissão concedida, mas o dispositivo ainda não está inscrito';
}

function PushStatusAction({
  isEnabled,
  inscrito,
  isRequesting,
  onEnable,
  onDisable,
}: AcaoStatus) {
  if (!isEnabled) {
    return (
      <Button onClick={onEnable} disabled={isRequesting}>
        {isRequesting ? 'Ativando...' : 'Ativar'}
      </Button>
    );
  }
  if (!inscrito) {
    return (
      <Button onClick={onEnable} disabled={isRequesting}>
        {isRequesting ? 'Inscrevendo...' : 'Inscrever dispositivo'}
      </Button>
    );
  }
  return (
    <Button variant="outline" onClick={onDisable} disabled={isRequesting}>
      Desativar neste dispositivo
    </Button>
  );
}

function PushStatus({
  isEnabled,
  isRequesting,
  inscrito,
  handleEnableNotifications,
  handleDisableNotifications,
}: Pick<
  ReturnType<typeof usePushNotificationSettings>,
  'isEnabled' | 'isRequesting' | 'inscrito' | 'handleEnableNotifications' | 'handleDisableNotifications'
>) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className={isEnabled ? 'rounded-full bg-success/10 p-2' : 'rounded-full bg-muted p-2'}>
          {isEnabled ? (
            <BellRing className="h-5 w-5 text-success" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {isEnabled ? 'Notificações ativas' : 'Notificações desativadas'}
          </p>
          <p className="text-sm text-muted-foreground">
            {descricaoStatus(isEnabled, inscrito)}
          </p>
        </div>
      </div>
      <PushStatusAction
        isEnabled={isEnabled}
        inscrito={inscrito}
        isRequesting={isRequesting}
        onEnable={handleEnableNotifications}
        onDisable={handleDisableNotifications}
      />
    </div>
  );
}

function PermissionDeniedNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Permissão bloqueada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Você bloqueou as notificações anteriormente. Para ativar:
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Clique no ícone de cadeado na barra de endereço</li>
          <li>Encontre "Notificações" nas configurações do site</li>
          <li>Altere de "Bloquear" para "Permitir"</li>
          <li>Recarregue a página</li>
        </ol>
      </div>
    </div>
  );
}

function EnabledNotificationSettings({ onTest }: { onTest: () => void }) {
  return (
    <>
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Tipos de alerta</h4>
        <div className="space-y-3">
          <AlertTypeRow
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            iconClass="bg-destructive/10"
            title="Tentativas de login falhas"
            description="Alerta quando houver tentativas inválidas"
          />
          <AlertTypeRow
            icon={<Smartphone className="h-4 w-4 text-orange" />}
            iconClass="bg-orange/10"
            title="Novos dispositivos"
            description="Alerta quando um novo dispositivo acessar"
          />
          <AlertTypeRow
            icon={<Bell className="h-4 w-4 text-primary" />}
            iconClass="bg-primary/10"
            title="Alertas gerais de segurança"
            description="Outras notificações importantes"
          />
        </div>
      </div>
      <div className="border-t pt-4">
        <Button variant="outline" onClick={onTest} className="w-full">
          <BellRing className="mr-2 h-4 w-4" />
          Enviar notificação de teste
        </Button>
      </div>
    </>
  );
}

function AlertTypeRow({
  icon,
  iconClass,
  title,
  description,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className={`rounded p-1.5 ${iconClass}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch defaultChecked disabled />
    </div>
  );
}
