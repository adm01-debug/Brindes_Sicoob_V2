import { useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, supabasePublishableKey, supabaseUrl } from '@/integrations/supabase/client';
import { invokeCrmBatch } from '@/lib/crm-db';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Server,
  Code,
  Clock,
  Wifi,
  TableProperties,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';

interface StatusItem {
  name: string;
  status: 'ok' | 'error' | 'warning' | 'loading';
  message: string;
  icon: ReactNode;
}

interface CrmTableCheck {
  name: string;
  status: 'ok' | 'error' | 'loading';
  rowCount?: number;
  message: string;
}

const CRM_CRITICAL_TABLES = [
  'companies',
  'contacts',
  'contact_emails',
  'contact_phones',
  'company_addresses',
  'company_social_media',
  'customers',
  'suppliers',
  'carriers',
];

const LOCAL_TABLES = ['quotes', 'quote_items', 'quote_templates', 'quote_history'] as const;
const INFRA_TABLES = ['ip_whitelist', 'city_whitelist', 'telemetry_events'] as const;

function environmentStatus(): StatusItem {
  const hasUrl = Boolean(supabaseUrl);
  const hasKey = Boolean(supabasePublishableKey);
  const missing = `${hasUrl ? '' : 'SUPABASE_URL '}${hasKey ? '' : 'SUPABASE_KEY'}`;
  return {
    name: 'Variáveis de Ambiente',
    status: hasUrl && hasKey ? 'ok' : 'error',
    message: hasUrl && hasKey ? 'Configuradas corretamente' : `Faltando: ${missing}`,
    icon: <Server className="h-5 w-5" />,
  };
}

async function databaseStatus(): Promise<StatusItem> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return {
      name: 'Conexão com Database',
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Conectado ao Lovable Cloud',
      icon: <Database className="h-5 w-5" />,
    };
  } catch (error) {
    return {
      name: 'Conexão com Database',
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro de conexão',
      icon: <Database className="h-5 w-5" />,
    };
  }
}

async function authenticationStatus(): Promise<StatusItem> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      name: 'Serviço de Autenticação',
      status: 'ok',
      message: session ? 'Usuário logado' : 'Serviço disponível (não autenticado)',
      icon: <Wifi className="h-5 w-5" />,
    };
  } catch (error) {
    return {
      name: 'Serviço de Autenticação',
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro no auth',
      icon: <Wifi className="h-5 w-5" />,
    };
  }
}

type CheckedTable = (typeof LOCAL_TABLES)[number] | (typeof INFRA_TABLES)[number];

interface TableGroupCheck {
  tables: readonly CheckedTable[];
  name: string;
  successMessage: string;
  failureMessage: string;
  icon: ReactNode;
}

async function tableGroupStatus(input: TableGroupCheck): Promise<StatusItem> {
  try {
    const checks = await Promise.all(
      input.tables.map(async (table) => {
        const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
        return { table, ok: !error };
      }),
    );
    const failed = checks.filter((check) => !check.ok);
    return {
      name: input.name,
      status: failed.length === 0 ? 'ok' : 'error',
      message:
        failed.length === 0
          ? input.successMessage
          : `Falha em: ${failed.map((item) => item.table).join(', ')}`,
      icon: input.icon,
    };
  } catch {
    return { name: input.name, status: 'error', message: input.failureMessage, icon: input.icon };
  }
}

async function collectHealthStatuses() {
  const frontend: StatusItem = {
    name: 'Frontend Build',
    status: 'ok',
    message: 'React app carregado com sucesso',
    icon: <Code className="h-5 w-5" />,
  };
  const network: StatusItem = {
    name: 'Conexão de Rede',
    status: navigator.onLine ? 'ok' : 'error',
    message: navigator.onLine ? 'Online' : 'Offline',
    icon: <Wifi className="h-5 w-5" />,
  };
  const [database, authentication, localTables, infrastructure] = await Promise.all([
    databaseStatus(),
    authenticationStatus(),
    tableGroupStatus({
      tables: LOCAL_TABLES,
      name: 'Tabelas de Orçamentos (Local)',
      successMessage: `${LOCAL_TABLES.length} tabelas verificadas`,
      failureMessage: 'Erro ao verificar tabelas locais',
      icon: <TableProperties className="h-5 w-5" />,
    }),
    tableGroupStatus({
      tables: INFRA_TABLES,
      name: 'Infraestrutura de Segurança',
      successMessage: 'IP Whitelist, City Whitelist e Telemetria operacionais',
      failureMessage: 'Erro ao verificar tabelas de infraestrutura',
      icon: <TableProperties className="h-5 w-5 text-indigo-500" />,
    }),
  ]);
  return [
    frontend,
    environmentStatus(),
    database,
    authentication,
    network,
    localTables,
    infrastructure,
  ];
}

function valueOrFallback(value: string | null | undefined, fallback: string) {
  return value || fallback;
}

function getCrmSampleMetrics(data: { count?: number; records?: unknown[] } | null | undefined) {
  if (!data) return { count: 0, sampleSize: 0 };
  return { count: data.count ?? 0, sampleSize: data.records?.length ?? 0 };
}

function mapCrmTableResult(
  name: string,
  result: Awaited<ReturnType<typeof invokeCrmBatch>>[number] | undefined,
): CrmTableCheck {
  if (!result) return { name, status: 'error', message: 'Sem resposta' };
  if (result.unavailable)
    return { name, status: 'error', message: valueOrFallback(result.warning, 'Tabela ausente') };
  if (!result.success)
    return { name, status: 'error', message: valueOrFallback(result.error, 'Erro desconhecido') };
  const metrics = getCrmSampleMetrics(result.data);
  return {
    name,
    status: 'ok',
    rowCount: metrics.count,
    message: `Acessível (${metrics.sampleSize} registro(s) de amostra)`,
  };
}

async function collectCrmStatuses(): Promise<CrmTableCheck[]> {
  const results = await invokeCrmBatch(
    CRM_CRITICAL_TABLES.map((table) => ({ table, select: 'id', limit: 1 })),
  );
  return CRM_CRITICAL_TABLES.map((table, index) => mapCrmTableResult(table, results[index]));
}

function useSystemStatusModel() {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [crmTables, setCrmTables] = useState<CrmTableCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingCrm, setIsCheckingCrm] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      setStatuses(await collectHealthStatuses());
      setLastCheck(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  const runCrmHealthCheck = async () => {
    setIsCheckingCrm(true);
    setCrmTables(
      CRM_CRITICAL_TABLES.map((name) => ({
        name,
        status: 'loading',
        message: 'Verificando...',
      })),
    );
    try {
      setCrmTables(await collectCrmStatuses());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na verificação em lote';
      setCrmTables(CRM_CRITICAL_TABLES.map((name) => ({ name, status: 'error', message })));
    } finally {
      setIsCheckingCrm(false);
    }
  };
  useEffect(() => {
    runHealthCheck();
    runCrmHealthCheck();
  }, []);

  return {
    statuses,
    crmTables,
    isChecking,
    isCheckingCrm,
    lastCheck,
    runHealthCheck,
    runCrmHealthCheck,
  };
}

type SystemStatusModel = ReturnType<typeof useSystemStatusModel>;
type HealthStatus = StatusItem['status'];

function getStatusIcon(status: HealthStatus) {
  if (status === 'ok') return <CheckCircle className="h-5 w-5 text-primary" />;
  if (status === 'error') return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === 'warning') return <AlertCircle className="h-5 w-5 text-warning" />;
  return <AlertCircle className="h-5 w-5 animate-pulse text-warning" />;
}

function getStatusBadge(status: HealthStatus) {
  if (status === 'ok')
    return <Badge className="border-primary/30 bg-primary/20 text-primary">OK</Badge>;
  if (status === 'error')
    return <Badge className="border-destructive/30 bg-destructive/20 text-destructive">Erro</Badge>;
  if (status === 'warning')
    return <Badge className="border-warning/30 bg-warning/20 text-warning">Aviso</Badge>;
  return <Badge className="border-warning/30 bg-warning/20 text-warning">Verificando</Badge>;
}

function OverallStatusCard({ model }: { model: SystemStatusModel }) {
  const isOperational = model.statuses.every((status) => status.status === 'ok');
  const okCount = model.statuses.filter((status) => status.status === 'ok').length;
  return (
    <Card
      className={`border-2 ${isOperational ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isOperational ? (
              <CheckCircle className="h-10 w-10 text-primary" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
            <div>
              <h2 className="font-display text-xl font-semibold">
                {isOperational ? 'Sistema Operacional' : 'Problemas Detectados'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {okCount}/{model.statuses.length} serviços funcionando
              </p>
            </div>
          </div>
          <Button onClick={model.runHealthCheck} disabled={model.isChecking} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${model.isChecking ? 'animate-spin' : ''}`} />
            Verificar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BuildInfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code className="h-5 w-5" />
          Informações da Build
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between border-b py-2">
          <span className="text-muted-foreground">Versão do App</span>
          <Badge variant="secondary">2.0.0</Badge>
        </div>
        <div className="flex items-center justify-between border-b py-2">
          <span className="text-muted-foreground">Data da Build</span>
          <span className="font-mono text-sm">2026-01-05</span>
        </div>
        <div className="flex items-center justify-between border-b py-2">
          <span className="text-muted-foreground">Ambiente</span>
          <Badge variant="outline">{import.meta.env.MODE}</Badge>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">React Version</span>
          <span className="font-mono text-sm">18.3.1</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceStatusCard({ statuses }: { statuses: StatusItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="h-5 w-5" />
          Status dos Serviços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {statuses.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{item.icon}</div>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(item.status)}
              {getStatusIcon(item.status)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CrmStatusCard({ model }: { model: SystemStatusModel }) {
  const okCount = model.crmTables.filter((table) => table.status === 'ok').length;
  const errorCount = model.crmTables.filter((table) => table.status === 'error').length;
  return (
    <Card>
      <CrmStatusHeader model={model} okCount={okCount} errorCount={errorCount} />
      <CrmTableList tables={model.crmTables} />
    </Card>
  );
}

function CrmStatusHeader({
  model,
  okCount,
  errorCount,
}: {
  model: SystemStatusModel;
  okCount: number;
  errorCount: number;
}) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" /> Tabelas CRM Externo
          {errorCount > 0 && (
            <Badge className="ml-2 border-destructive/30 bg-destructive/20 text-destructive">
              {errorCount} ausente(s)
            </Badge>
          )}
          {errorCount === 0 && okCount > 0 && (
            <Badge className="ml-2 border-primary/30 bg-primary/20 text-primary">
              {okCount}/{CRM_CRITICAL_TABLES.length} OK
            </Badge>
          )}
        </CardTitle>
        <Button
          onClick={model.runCrmHealthCheck}
          disabled={model.isCheckingCrm}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${model.isCheckingCrm ? 'animate-spin' : ''}`}
          />{' '}
          Re-verificar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Verifica a disponibilidade das tabelas críticas no banco CRM externo via bridge.
      </p>
    </CardHeader>
  );
}

function CrmTableList({ tables }: { tables: CrmTableCheck[] }) {
  return (
    <CardContent className="space-y-1">
      {tables.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">Aguardando verificação...</p>
      )}
      {tables.map((table) => (
        <div
          key={table.name}
          className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <TableProperties className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-mono text-sm font-medium">{table.name}</p>
              <p className="text-xs text-muted-foreground">{table.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(table.status)}
            {getStatusIcon(table.status)}
          </div>
        </div>
      ))}
    </CardContent>
  );
}

function LastCheck({ value }: { value: Date | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      Última verificação: {value.toLocaleTimeString('pt-BR')}
    </div>
  );
}

export default function SystemStatusPage() {
  const model = useSystemStatusModel();
  return (
    <div className="mx-auto min-h-screen w-full max-w-[1920px] animate-fade-in space-y-3 bg-background px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <PageSEO
        title="Status do Sistema"
        description="Monitore a saúde e status de todos os serviços."
        path="/status"
        noIndex
      />
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-bold">Status do Sistema</h1>
          <p className="text-muted-foreground">Diagnóstico de saúde da aplicação</p>
        </div>
        <OverallStatusCard model={model} />
        <BuildInfoCard />
        <ServiceStatusCard statuses={model.statuses} />
        <CrmStatusCard model={model} />
        <LastCheck value={model.lastCheck} />
        <div className="text-center">
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
