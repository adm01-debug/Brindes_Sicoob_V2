import { lazy, Suspense } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  RefreshCw,
  Zap,
  Trash2,
  Download,
  FileText,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useTelemetryData,
  formatDuration,
  formatTime,
  type SeverityFilter,
  type TelemetryRow,
  type TimeFilter,
} from './telemetry/useTelemetryData';
import { useErrorCounters } from './telemetry/useErrorCounters';
import { exportCSV, exportPDF } from './telemetry/exportHelpers';
import {
  CardSkeleton,
  BannerSkeleton,
  ChartsSkeleton,
  GridCardsSkeleton,
} from './telemetry/TelemetrySkeletons';
import { InstrumentationToggleButton } from '@/components/admin/telemetry/InstrumentationToggleButton';

// ============================================================================
// CODE-SPLIT: cada card pesado entra como chunk próprio.
// O shell + KPIs renderizam imediatamente no FCP; cada card aparece ao vivo
// quando seu chunk JS termina de baixar (Suspense com Skeleton de altura fixa
// para evitar CLS).
//
// Cards selecionados por peso: TelemetryCharts (recharts), HighLimitTelemetryCard
// (recharts + agregações), ColdStartRetriesPanel, OptimizationQueuePanel
// (tabela com mutations), ResolveProductsSelectComparisonCard.
// ============================================================================
const TelemetryCharts = lazy(() =>
  import('@/components/admin/telemetry/TelemetryCharts').then((m) => ({
    default: m.TelemetryCharts,
  })),
);
const ProductsListingLatencyAlert = lazy(() =>
  import('@/components/admin/telemetry/ProductsListingLatencyAlert').then((m) => ({
    default: m.ProductsListingLatencyAlert,
  })),
);
const ResolveProductsSelectComparisonCard = lazy(() =>
  import('@/components/admin/telemetry/ResolveProductsSelectComparisonCard').then((m) => ({
    default: m.ResolveProductsSelectComparisonCard,
  })),
);
const HighLimitTelemetryCard = lazy(() =>
  import('@/components/admin/telemetry/HighLimitTelemetryCard').then((m) => ({
    default: m.HighLimitTelemetryCard,
  })),
);
const OptimizationMetricsCards = lazy(() =>
  import('@/components/admin/telemetry/OptimizationMetricsCards').then((m) => ({
    default: m.OptimizationMetricsCards,
  })),
);
const RegressionGuardrailBanner = lazy(() =>
  import('@/components/admin/telemetry/RegressionGuardrailBanner').then((m) => ({
    default: m.RegressionGuardrailBanner,
  })),
);
const OptimizationQueuePanel = lazy(() =>
  import('@/components/admin/telemetry/OptimizationQueuePanel').then((m) => ({
    default: m.OptimizationQueuePanel,
  })),
);
const PlatformFailureCards = lazy(() =>
  import('@/components/admin/telemetry/PlatformFailureCards').then((m) => ({
    default: m.PlatformFailureCards,
  })),
);
const PlatformFailureAlertBanner = lazy(() =>
  import('@/components/admin/telemetry/PlatformFailureAlertBanner').then((m) => ({
    default: m.PlatformFailureAlertBanner,
  })),
);
const AppHealthDashboard = lazy(() =>
  import('@/components/admin/telemetry/AppHealthDashboard').then((m) => ({
    default: m.AppHealthDashboard,
  })),
);
const ColdStartRetriesPanel = lazy(() =>
  import('@/components/admin/telemetry/ColdStartRetriesPanel').then((m) => ({
    default: m.ColdStartRetriesPanel,
  })),
);
const BridgesLiveCard = lazy(() =>
  import('@/components/admin/telemetry/BridgesLiveCard').then((m) => ({
    default: m.BridgesLiveCard,
  })),
);
const BridgeAlertsCard = lazy(() =>
  import('@/components/admin/telemetry/BridgeAlertsCard').then((m) => ({
    default: m.BridgeAlertsCard,
  })),
);
const ColdVsWarmCrmCard = lazy(() =>
  import('@/components/admin/telemetry/ColdVsWarmCrmCard').then((m) => ({
    default: m.ColdVsWarmCrmCard,
  })),
);
const BreakerStatusCard = lazy(() =>
  import('@/components/admin/telemetry/BreakerStatusCard').then((m) => ({
    default: m.BreakerStatusCard,
  })),
);
const EdgeFunctionLogsPanel = lazy(() =>
  import('@/components/admin/telemetry/EdgeFunctionLogsPanel').then((m) => ({
    default: m.EdgeFunctionLogsPanel,
  })),
);
const AppLogsTable = lazy(() =>
  import('@/components/admin/telemetry/AppLogsTable').then((m) => ({ default: m.AppLogsTable })),
);

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'very_slow':
      return (
        <Badge className="border-destructive/30 bg-destructive/20 text-[10px] text-destructive">
          🔴 Muito Lenta
        </Badge>
      );
    case 'slow':
      return (
        <Badge className="border-warning/30 bg-warning/20 text-[10px] text-warning">🟡 Lenta</Badge>
      );
    case 'error':
      return (
        <Badge className="border-destructive/30 bg-destructive/20 text-[10px] text-destructive">
          ❌ Erro
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          {severity}
        </Badge>
      );
  }
};

type ErrorCounterTone = 'destructive' | 'warning' | 'muted';

const ERROR_COUNTER_CARD_CLASS: Record<ErrorCounterTone, string> = {
  destructive: 'border-destructive/40 bg-destructive/5',
  warning: 'border-warning/40 bg-warning/5',
  muted: '',
};

const ERROR_COUNTER_ICON_CLASS: Record<ErrorCounterTone, string> = {
  destructive: 'bg-destructive/15 text-destructive',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-muted text-muted-foreground',
};

const ERROR_COUNTER_VALUE_CLASS: Record<ErrorCounterTone, string> = {
  destructive: 'text-destructive',
  warning: 'text-warning',
  muted: '',
};

function getErrorCounterTone(value: number): ErrorCounterTone {
  if (value > 10) return 'destructive';
  if (value > 0) return 'warning';
  return 'muted';
}

function ErrorCounterCard({
  value,
  label,
  sub,
  isLoading,
  isError,
}: {
  value: number | null;
  label: string;
  sub: string;
  isLoading: boolean;
  isError: boolean;
}) {
  const tone = value === null ? 'muted' : getErrorCounterTone(value);
  return (
    <Card className={cn('border-[1.5px] transition-colors', ERROR_COUNTER_CARD_CLASS[tone])}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('rounded-lg p-2.5', ERROR_COUNTER_ICON_CLASS[tone])}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={cn(
              'font-display text-3xl font-bold tabular-nums leading-tight',
              ERROR_COUNTER_VALUE_CLASS[tone],
            )}
          >
            {isLoading ? '—' : isError ? 'Falha' : value}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TelemetryFailureBanner({
  telemetryError,
  counterError,
  onRetry,
}: {
  telemetryError: boolean;
  counterError: boolean;
  onRetry: () => void;
}) {
  if (!telemetryError && !counterError) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Os indicadores estão indisponíveis; nenhum valor foi interpretado como zero.</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />Tentar novamente
      </Button>
    </div>
  );
}

function TelemetryTable({
  rows,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  rows: TelemetryRow[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>;
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive/70" />
        <div><p className="font-medium text-foreground">Falha ao consultar a telemetria</p>
          <p className="mt-1 text-sm">{error instanceof Error ? error.message : 'Tente novamente em instantes.'}</p></div>
        <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Activity className="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p className="font-medium">Nenhuma query lenta registrada</p>
        <p className="mt-1 text-sm">Isso é bom! O sistema está performando bem.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/30">
          <th className="p-3 text-left font-medium text-muted-foreground">Quando</th><th className="p-3 text-left font-medium text-muted-foreground">Operação</th>
          <th className="p-3 text-left font-medium text-muted-foreground">Tabela/RPC</th><th className="p-3 text-right font-medium text-muted-foreground">Duração</th>
          <th className="p-3 text-right font-medium text-muted-foreground">Records</th><th className="p-3 text-right font-medium text-muted-foreground">Limit</th>
          <th className="p-3 text-right font-medium text-muted-foreground">Offset</th><th className="p-3 text-left font-medium text-muted-foreground">Count</th>
          <th className="p-3 text-left font-medium text-muted-foreground">Severidade</th>
        </tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id} className="border-b border-border/30 transition-colors hover:bg-muted/20">
            <td className="whitespace-nowrap p-3 font-mono text-xs text-muted-foreground">{formatTime(row.created_at)}</td>
            <td className="p-3"><Badge variant="outline" className="font-mono text-[10px]">{row.operation}</Badge></td>
            <td className="p-3 font-mono text-xs font-medium">{row.rpc_name || row.table_name || '-'}</td>
            <td className="p-3 text-right font-mono font-bold tabular-nums"><span className={row.duration_ms >= 8000 ? 'text-destructive' : row.duration_ms >= 3000 ? 'text-warning' : ''}>{formatDuration(row.duration_ms)}</span></td>
            <td className="p-3 text-right font-mono text-xs tabular-nums">{row.record_count ?? '-'}</td>
            <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{row.query_limit ?? '-'}</td>
            <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{row.query_offset ?? '-'}</td>
            <td className="p-3 text-xs text-muted-foreground">{row.count_mode || '-'}</td><td className="p-3">{getSeverityBadge(row.severity)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function AdminTelemetriaPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    handleCleanup,
    severityFilter,
    setSeverityFilter,
    timeFilter,
    setTimeFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    stats,
    topOffenders,
  } = useTelemetryData();
  const {
    errors1h,
    errors24h,
    isLoading: errorsLoading,
    isError: errorsError,
    refetch: refetchErrors,
  } = useErrorCounters();

  return (
    <>
      <PageSEO
        title="Telemetria — Monitoramento"
        description="Monitoramento de performance de queries do banco externo"
        path="/admin/telemetria"
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Telemetria de Queries</h1>
              <p className="text-sm text-muted-foreground">
                Monitoramento de performance do banco externo
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InstrumentationToggleButton />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(rows, timeFilter)}
              disabled={!rows.length}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPDF(rows, timeFilter, customDateFrom, customDateTo)}
              disabled={!rows.length}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCleanup}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Limpar +7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Saúde da Aplicação — KPIs 4xx/5xx por rota, webhooks, latência por edge fn + lookup por request-id */}
        <Suspense fallback={<CardSkeleton height={520} label="Carregando saúde da aplicação" />}>
          <AppHealthDashboard />
        </Suspense>

        {/* Guardrail automático: interrompe regressões antes que afetem usuários */}
        <Suspense fallback={<BannerSkeleton />}>
          <RegressionGuardrailBanner />
        </Suspense>

        {/* Fila automática de otimizações — executa todas em sequência sem pausas */}
        <Suspense fallback={<CardSkeleton height={140} label="Carregando fila de otimizações" />}>
          <OptimizationQueuePanel />
        </Suspense>

        <TelemetryFailureBanner telemetryError={isError} counterError={errorsError}
          onRetry={() => { void refetch(); void refetchErrors(); }} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              value: errors1h,
              label: 'Erros na última 1h',
              sub: 'Janela móvel · auto-refresh 30s',
            },
            {
              value: errors24h,
              label: 'Erros nas últimas 24h',
              sub: 'Janela móvel · auto-refresh 30s',
            },
          ].map(({ value, label, sub }) => (
            <ErrorCounterCard
              key={label}
              value={value}
              label={label}
              sub={sub}
              isLoading={errorsLoading}
              isError={errorsError}
            />
          ))}
        </div>

        {/* Banner de alerta + log central quando taxa de 503/cold-start excede o limite configurado */}
        <Suspense fallback={<BannerSkeleton />}>
          <PlatformFailureAlertBanner windowMinutes={60} />
        </Suspense>

        {/* KPIs de falhas de plataforma (503 / cold-start) — janela móvel de 60min */}
        <Suspense fallback={<GridCardsSkeleton count={4} height={100} />}>
          <PlatformFailureCards windowMinutes={60} />
        </Suspense>

        {/* Resumo por tentativa (attempt, base, jitter, delay, motivo) dos cold-starts em tempo real */}
        <Suspense fallback={<CardSkeleton height={180} label="Carregando retries de cold-start" />}>
          <ColdStartRetriesPanel />
        </Suspense>

        {/* Telemetria client-side ao vivo das chamadas às bridges (external/CRM) */}
        <Suspense
          fallback={<CardSkeleton height={260} label="Carregando telemetria das bridges" />}
        >
          <BridgesLiveCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={520} label="Carregando logs do sistema" />}>
          <AppLogsTable />
        </Suspense>

        {/* Logs ao vivo das edge functions com correlação por request_id */}
        <Suspense fallback={<CardSkeleton height={520} label="Carregando logs edge functions" />}>
          <EdgeFunctionLogsPanel />
        </Suspense>

        {/* Alertas configuráveis por bridge — limiares de p95 e payload */}
        <Suspense fallback={<CardSkeleton height={200} label="Carregando alertas das bridges" />}>
          <BridgeAlertsCard />
        </Suspense>

        {/* Cold vs Warm path do isolate atual do crm-db-bridge (poll ?op=diag) */}
        <Suspense fallback={<CardSkeleton height={260} label="Carregando snapshot cold/warm" />}>
          <ColdVsWarmCrmCard />
        </Suspense>

        {/* Estado do circuit-breaker do crm-db-bridge (poll ?op=breaker_status) */}
        <Suspense fallback={<CardSkeleton height={200} label="Carregando estado do breaker" />}>
          <BreakerStatusCard />
        </Suspense>

        {/* Métricas das otimizações Onda 2 (cache hit rate + retries evitados) */}
        <Suspense fallback={<GridCardsSkeleton count={3} height={100} />}>
          <OptimizationMetricsCards />
        </Suspense>

        {/* Alerta de regressão de latência em listings de products (limit > 50) */}
        <Suspense fallback={<BannerSkeleton />}>
          <ProductsListingLatencyAlert />
        </Suspense>

        {/* Comparativo antes vs depois do resolveProductsSelect (lightweight forçado em listings limit>50) */}
        <Suspense fallback={<CardSkeleton height={160} label="Carregando comparativo" />}>
          <ResolveProductsSelectComparisonCard />
        </Suspense>

        {/* Gráficos segmentados por endpoint/timestamp/error_kind — escopo limit > 50 */}
        <Suspense fallback={<ChartsSkeleton />}>
          <HighLimitTelemetryCard />
        </Suspense>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              icon: AlertTriangle,
              color: 'destructive',
              value: stats.verySlow,
              label: 'Muito Lentas (>8s)',
            },
            { icon: Clock, color: 'warning', value: stats.slow, label: 'Lentas (>3s)' },
            { icon: Zap, color: 'destructive', value: stats.errors, label: 'Erros' },
            {
              icon: Database,
              color: 'primary',
              value: formatDuration(stats.avgDuration),
              label: 'Média de duração',
            },
          ].map(({ icon: Icon, color, value, label }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 bg-${color}/10`}>
                  <Icon className={`h-5 w-5 text-${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Offenders */}
        {topOffenders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Tabelas Mais Problemáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {topOffenders.map((s) => (
                  <div key={s.name} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <p className="truncate font-mono text-sm font-medium" title={s.name}>
                      {s.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.count}× alertas</span>
                      <span className="text-xs text-destructive">
                        max {formatDuration(s.maxMs)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      média: {formatDuration(Math.round(s.totalMs / s.count))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Suspense fallback={<ChartsSkeleton />}>
          <TelemetryCharts rows={rows} timeFilter={timeFilter} />
        </Suspense>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="slow">🟡 Lentas</SelectItem>
              <SelectItem value="very_slow">🔴 Muito Lentas</SelectItem>
              <SelectItem value="error">❌ Erros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="custom">📅 Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {timeFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !customDateFrom && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Data início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !customDateTo && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Data fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    disabled={(date) =>
                      date > new Date() || (customDateFrom ? date < customDateFrom : false)
                    }
                    initialFocus
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {rows.length} de até 500 registros · auto-refresh 30s
          </span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <TelemetryTable rows={rows} isLoading={isLoading} isError={isError} error={error}
              onRetry={() => void refetch()} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
