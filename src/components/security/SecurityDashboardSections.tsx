import type { ReactNode } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  Fingerprint,
  Globe,
  History,
  Key,
  Lock,
  MapPin,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Unlock,
  Users,
  XCircle,
} from 'lucide-react';
import { KnownDevicesManager } from '@/components/auth/KnownDevicesManager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeoBlockingManager } from './GeoBlockingManager';
import { IPRestrictionManager } from './IPRestrictionManager';
import { PasskeyManager } from './PasskeyManager';
import { PushNotificationSettings } from './PushNotificationSettings';
import { TwoFactorSetup } from './TwoFactorSetup';
import {
  getScoreColor,
  getScoreLabel,
  getScoreProgressColor,
  type LoginAttempt,
  type SecurityMetrics,
  type SecurityNotification,
  type UserProfile,
} from './useSecurityData';

export interface SecurityRecommendation {
  icon: ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium';
}

export function buildSecurityRecommendations(
  mfaAvailable: boolean,
  mfaEnabled: boolean,
  allowedIpCount: number,
  failedLogins: number,
): SecurityRecommendation[] {
  const recommendations: SecurityRecommendation[] = [];
  if (mfaAvailable && !mfaEnabled)
    recommendations.push({
      icon: <Key className="h-4 w-4" />,
      title: 'Ativar autenticação de dois fatores',
      description: 'Adiciona uma camada extra de segurança à sua conta',
      priority: 'high',
    });
  if (allowedIpCount === 0)
    recommendations.push({
      icon: <Globe className="h-4 w-4" />,
      title: 'Configurar restrição de IP',
      description: 'Limite o acesso por endereços IP específicos',
      priority: 'medium',
    });
  if (failedLogins > 3)
    recommendations.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Revisar tentativas de login falhas',
      description: 'Foram detectadas várias tentativas de login sem sucesso',
      priority: 'high',
    });
  return recommendations;
}

interface AdminUserSelectorProps {
  visible: boolean;
  users: UserProfile[];
  currentUserId?: string;
  selectedUserId: string | null;
  selectedUser?: UserProfile;
  managingOther: boolean;
  onSelect: (id: string | null) => void;
}

export function AdminUserSelector({
  visible,
  users,
  currentUserId,
  selectedUserId,
  selectedUser,
  managingOther,
  onSelect,
}: AdminUserSelectorProps) {
  if (!visible) return null;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pb-4 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Gerenciar segurança de:</span>
          </div>
          <Select
            value={selectedUserId || currentUserId || ''}
            onValueChange={(value) => onSelect(value === currentUserId ? null : value)}
          >
            <SelectTrigger className="w-[500px] bg-background" aria-label="Usuário gerenciado">
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {users.map((profile) => (
                <UserSelectOption
                  key={profile.user_id}
                  profile={profile}
                  isCurrentUser={profile.user_id === currentUserId}
                />
              ))}
            </SelectContent>
          </Select>
          {managingOther && (
            <Badge variant="outline" className="border-primary text-primary">
              Gerenciando: {selectedUser?.full_name || selectedUser?.email}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UserSelectOption({
  profile,
  isCurrentUser,
}: {
  profile: UserProfile;
  isCurrentUser: boolean;
}) {
  return (
    <SelectItem value={profile.user_id}>
      <div className="flex items-center gap-2">
        <span>{profile.full_name || 'Sem nome'}</span>
        <span className="text-xs text-muted-foreground">({profile.email})</span>
        {isCurrentUser && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Você
          </Badge>
        )}
      </div>
    </SelectItem>
  );
}

function getScoreIcon(score: number) {
  if (score >= 80) return <ShieldCheck className="h-8 w-8 text-success" />;
  if (score >= 60) return <Shield className="h-8 w-8 text-warning" />;
  if (score >= 40) return <ShieldAlert className="h-8 w-8 text-orange" />;
  return <ShieldX className="h-8 w-8 text-destructive" />;
}

function MfaSummary({ available, enabled }: { available: boolean; enabled: boolean }) {
  if (!available)
    return (
      <>
        <span className="text-sm text-muted-foreground">Status de MFA indisponível</span>
      </>
    );
  return enabled ? (
    <>
      <Lock className="h-5 w-5 text-success" />
      <span className="text-lg font-semibold text-success">Ativo</span>
    </>
  ) : (
    <>
      <Unlock className="h-5 w-5 text-destructive" />
      <span className="text-lg font-semibold text-destructive">Inativo</span>
    </>
  );
}

function MfaStateIcon({ available, enabled }: { available: boolean; enabled: boolean }) {
  if (!available) return null;
  return enabled ? (
    <CheckCircle2 className="h-4 w-4 text-success" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
}

interface SecurityScoreCardProps {
  metrics: SecurityMetrics;
  managingOther: boolean;
  selectedUser?: UserProfile;
  mfaAvailable: boolean;
  mfaEnabled: boolean;
  allowedIpCount: number;
}

function SecurityScoreCard({
  metrics,
  managingOther,
  selectedUser,
  mfaAvailable,
  mfaEnabled,
  allowedIpCount,
}: SecurityScoreCardProps) {
  const description = managingOther
    ? `Avaliação de segurança de ${selectedUser?.full_name || selectedUser?.email}`
    : 'Avaliação geral da segurança da sua conta';
  const mfaLabel = !mfaAvailable ? 'não consultável' : mfaEnabled ? 'ativo' : 'inativo';
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Pontuação de Segurança
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <SecurityScoreGauge score={metrics.score} />
          <SecurityScoreDetails
            metrics={metrics}
            mfaAvailable={mfaAvailable}
            mfaEnabled={mfaEnabled}
            mfaLabel={mfaLabel}
            allowedIpCount={allowedIpCount}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityScoreGauge({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-4">
      {getScoreIcon(score)}
      <span className={`mt-2 text-3xl font-bold ${getScoreColor(score)}`}>{score}%</span>
      <Badge variant={score >= 60 ? 'default' : 'destructive'} className="mt-1">
        {getScoreLabel(score)}
      </Badge>
    </div>
  );
}

function SecurityScoreDetails({
  metrics,
  mfaAvailable,
  mfaEnabled,
  mfaLabel,
  allowedIpCount,
}: Pick<SecurityScoreCardProps, 'metrics' | 'mfaAvailable' | 'mfaEnabled' | 'allowedIpCount'> & {
  mfaLabel: string;
}) {
  return (
    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progresso da segurança</span>
          <span className={getScoreColor(metrics.score)}>{metrics.score}%</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full transition-all duration-500 ${getScoreProgressColor(metrics.score)}`}
            style={{ width: `${metrics.score}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <MfaStateIcon available={mfaAvailable} enabled={mfaEnabled} />
          <span>MFA {mfaLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {allowedIpCount > 0 ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{allowedIpCount} IPs permitidos</span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span>{metrics.knownDevicesCount} dispositivos</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span>{metrics.recentLoginAttempts} logins recentes</span>
        </div>
      </div>
    </div>
  );
}

export function SecurityOverview({
  metrics,
  managingOther,
  selectedUser,
  mfaAvailable,
  mfaEnabled,
  allowedIpCount,
}: {
  metrics: SecurityMetrics;
  managingOther: boolean;
  selectedUser?: UserProfile;
  mfaAvailable: boolean;
  mfaEnabled: boolean;
  allowedIpCount: number;
}) {
  const mfaDetail = !mfaAvailable
    ? 'Pontuação parcial: MFA não incluído'
    : mfaEnabled
      ? 'Proteção extra ativada'
      : 'Recomendado ativar';
  const hasAlerts = metrics.securityAlerts > 0;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SecurityScoreCard
        metrics={metrics}
        managingOther={managingOther}
        selectedUser={selectedUser}
        mfaAvailable={mfaAvailable}
        mfaEnabled={mfaEnabled}
        allowedIpCount={allowedIpCount}
      />
      <MfaOverviewCard available={mfaAvailable} enabled={mfaEnabled} detail={mfaDetail} />
      <SecurityAlertsCard count={metrics.securityAlerts} hasAlerts={hasAlerts} />
    </div>
  );
}

function MfaOverviewCard({
  available,
  enabled,
  detail,
}: {
  available: boolean;
  enabled: boolean;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Key className="h-4 w-4" />
          MFA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <MfaSummary available={available} enabled={enabled} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SecurityAlertsCard({ count, hasAlerts }: { count: number; hasAlerts: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {hasAlerts ? (
            <>
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-lg font-semibold text-warning">{count}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-lg font-semibold text-success">0</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasAlerts ? 'Alertas não lidos' : 'Nenhum alerta pendente'}
        </p>
      </CardContent>
    </Card>
  );
}

export function SecurityRecommendations({
  recommendations,
}: {
  recommendations: SecurityRecommendation[];
}) {
  if (recommendations.length === 0) return null;
  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Recomendações de Segurança
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.title}
              className="flex items-start gap-3 rounded-lg bg-background p-3"
            >
              <div
                className={`rounded-full p-2 ${recommendation.priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-orange/10 text-orange'}`}
              >
                {recommendation.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">{recommendation.title}</h4>
                <p className="text-xs text-muted-foreground">{recommendation.description}</p>
              </div>
              <Badge variant={recommendation.priority === 'high' ? 'destructive' : 'secondary'}>
                {recommendation.priority === 'high' ? 'Alta' : 'Média'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentLogins({ attempts }: { attempts: LoginAttempt[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Logins Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {attempts.slice(0, 10).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-3">
                  {attempt.success ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{attempt.ip_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(attempt.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={attempt.success ? 'default' : 'destructive'}>
                  {attempt.success ? 'Sucesso' : 'Falha'}
                </Badge>
              </div>
            ))}
            {attempts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum login registrado
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SecurityAlerts({ notifications }: { notifications: SecurityNotification[] }) {
  if (notifications.length === 0) return <EmptySecurityAlerts />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Alertas de Segurança
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <SecurityAlertItem key={notification.id} notification={notification} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function EmptySecurityAlerts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Alertas de Segurança
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-success" />
          <p className="text-sm font-medium">Tudo seguro!</p>
          <p className="text-xs text-muted-foreground">Nenhum alerta de segurança pendente</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityAlertItem({ notification }: { notification: SecurityNotification }) {
  const createdAt = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });
  return (
    <div
      className={`rounded-lg border p-3 ${notification.is_read ? '' : 'border-primary/20 bg-primary/5'}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-orange" />
        <div className="flex-1">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">{createdAt}</p>
        </div>
        {!notification.is_read && (
          <Badge variant="secondary" className="text-xs">
            Novo
          </Badge>
        )}
      </div>
    </div>
  );
}

function LoginHistory({
  attempts,
  managingOther,
  selectedUser,
}: {
  attempts: LoginAttempt[];
  managingOther: boolean;
  selectedUser?: UserProfile;
}) {
  const description = managingOther
    ? `Tentativas de login de ${selectedUser?.full_name || selectedUser?.email}`
    : 'Todas as tentativas de login na sua conta';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Logins
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <LoginAttemptRow key={attempt.id} attempt={attempt} />
            ))}
            {attempts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum login registrado ainda
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function LoginAttemptRow({ attempt }: { attempt: LoginAttempt }) {
  const createdAt = format(new Date(attempt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${attempt.success ? '' : 'border-destructive/20 bg-destructive/5'}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`rounded-full p-2 ${attempt.success ? 'bg-success/10' : 'bg-destructive/10'}`}
        >
          {attempt.success ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {attempt.success ? 'Login bem-sucedido' : 'Tentativa falha'}
            </span>
            <Badge variant={attempt.success ? 'default' : 'destructive'} className="text-xs">
              {attempt.success ? 'OK' : 'Falha'}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {attempt.ip_address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {createdAt}
            </span>
          </div>
          {attempt.failure_reason && (
            <p className="mt-1 text-xs text-destructive">Motivo: {attempt.failure_reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SecurityTabsProps {
  loginAttempts: LoginAttempt[];
  notifications: SecurityNotification[];
  managingOther: boolean;
  selectedUserId: string | null;
  selectedUser?: UserProfile;
}

export function SecurityTabs({
  loginAttempts,
  notifications,
  managingOther,
  selectedUserId,
  selectedUser,
}: SecurityTabsProps) {
  const managedUserId = managingOther && selectedUserId ? selectedUserId : undefined;
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <SecurityTabList />
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <RecentLogins attempts={loginAttempts} />
          <SecurityAlerts notifications={notifications} />
        </div>
      </TabsContent>
      <TabsContent value="mfa">
        <TwoFactorSetup
          targetUserId={managedUserId}
          targetUserEmail={managingOther ? selectedUser?.email || undefined : undefined}
        />
      </TabsContent>
      <TabsContent value="passkeys">
        <PasskeyManager targetUserId={managedUserId} />
      </TabsContent>
      <TabsContent value="devices">
        <KnownDevicesManager targetUserId={managedUserId} />
      </TabsContent>
      <TabsContent value="ips">
        <IPRestrictionManager />
      </TabsContent>
      <TabsContent value="geo">
        <GeoBlockingManager />
      </TabsContent>
      <TabsContent value="notifications">
        <PushNotificationSettings />
      </TabsContent>
      <TabsContent value="history" className="space-y-4">
        <LoginHistory
          attempts={loginAttempts}
          managingOther={managingOther}
          selectedUser={selectedUser}
        />
      </TabsContent>
    </Tabs>
  );
}

const SECURITY_TABS = [
  { value: 'overview', label: 'Visão Geral', icon: Eye },
  { value: 'mfa', label: 'MFA', icon: Key },
  { value: 'passkeys', label: 'Passkeys', icon: Fingerprint },
  { value: 'devices', label: 'Dispositivos', icon: Monitor },
  { value: 'ips', label: 'IPs', icon: Globe },
  { value: 'geo', label: 'Geo', icon: MapPin },
  { value: 'notifications', label: 'Push', icon: Bell },
  { value: 'history', label: 'Histórico', icon: History },
];

function SecurityTabList() {
  return (
    <TabsList className="flex h-auto flex-wrap gap-1">
      {SECURITY_TABS.map((tab) => (
        <SecurityTabTrigger key={tab.value} {...tab} />
      ))}
    </TabsList>
  );
}

function SecurityTabTrigger({ value, label, icon }: (typeof SECURITY_TABS)[number]) {
  const TabIcon = icon;
  return (
    <TabsTrigger value={value} className="flex items-center gap-2">
      <TabIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}
