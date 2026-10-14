import { isNullish } from "@/components/admin/utils/nullish";
import { useState, useEffect, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Activity, AlertTriangle, Gauge, Search, Webhook, Zap, Timer, Database, ShieldCheck, Heart, RefreshCw } from "lucide-react";
import { cn } from '@/lib/utils';
import {
  useAppHealth,
  lookupRequestId,
  type HealthWindow,
  type RequestIdLookup,
  type AppHealthSummary,
  type AppHealthKpis,
  type RouteErrorRow,
  type WebhookSourceRow,
  type EdgeLatencyRow,
  type SlowQueryRow,
} from '@/pages/admin/telemetry/useAppHealth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { diagnostics, type AppHealthStatus } from '@/lib/diagnostics';
import { motion } from "framer-motion";
import { Separator } from '@/components/ui/separator';
import { WebVitalsPanel } from './WebVitalsPanel';

const DESTRUCTIVE_METRIC_TEXT = 'text-destructive font-semibold';
const WARNING_TEXT = 'text-warning';

const WINDOW_OPTIONS: { value: HealthWindow; label: string }[] = [
  { value: 15, label: '15min' },
  { value: 60, label: '1h' },
  { value: 360, label: '6h' },
  { value: 1440, label: '24h' },
];

function fmtMs(n: number | null | undefined) {
  if (isNullish(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${n}ms`;
}

function statusTone(rate: number, warn = 1, danger = 5) {
  if (rate >= danger) return 'destructive';
  if (rate >= warn) return 'warning';
  return 'muted';
}

export function AppHealthDashboard() {
  const [windowMinutes, setWindowMinutes] = useState<HealthWindow>(60);
  const [requestIdQuery, setRequestIdQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<RequestIdLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const { data, slowQueries, isLoadingSlow, isLoading, isFetching, refetch } = useAppHealth(windowMinutes);
  const [localHealth, setLocalHealth] = useState<AppHealthStatus>(diagnostics.getHealthStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalHealth(diagnostics.getHealthStatus());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLookup = async () => {
    const id = requestIdQuery.trim();
    if (!id) return;
    setLookupLoading(true);
    try {
      const res = await lookupRequestId(id);
      setLookupResult(res);
      if (res.event_count === 0) {
        toast.info('Nenhum evento encontrado para este request-id');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no lookup');
    } finally {
      setLookupLoading(false);
    }
  };

  const kpis = (data?.kpis);
  const tone4xx = statusTone((kpis?.pct_4xx ?? 0), 5, 15);
  const tone5xx = statusTone((kpis?.pct_5xx ?? 0), 1, 5);
  
  return (
    <section
      id="saude-aplicacao"
      data-testid="app-health-dashboard"
      className="space-y-3 sm:space-y-4 border border-border/60 rounded-xl p-3 sm:p-4 bg-card/40"
    >
      {/* Dashboard de Saúde Sicoob OND-018 */}
      <HealthOverview
        health={localHealth}
        windowMinutes={windowMinutes}
        setWindowMinutes={setWindowMinutes}
        isFetching={isFetching}
        refetch={refetch}
      />

      <Separator className="bg-border/40" />

      {/* Web Vitals Panel OND-025 */}
      <WebVitalsPanel />

      <Separator className="bg-border/40" />

      {/* KPI cards originais com estilo Sicoob */}
      <KpiGrid
        isLoading={isLoading}
        kpis={kpis}
        windowMinutes={windowMinutes}
        tone4xx={tone4xx}
        tone5xx={tone5xx}
      />

      {/* Lookup por request-id */}
      <RequestLookupCard
        query={requestIdQuery}
        setQuery={setRequestIdQuery}
        loading={lookupLoading}
        result={lookupResult}
        onLookup={handleLookup}
      />

      {/* 3 tabelas em grid */}
      <HealthTables
        data={data}
        isLoading={isLoading}
        slowQueries={slowQueries}
        isLoadingSlow={isLoadingSlow}
      />
    </section>
  );
}

function healthBadgeClass(status: AppHealthStatus["status"]): string {
  if (status === 'healthy') return "bg-sicoob-green/10 text-sicoob-green border-sicoob-green/20";
  if (status === 'degraded') return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function healthDotClass(status: AppHealthStatus["status"]): string {
  if (status === 'healthy') return "bg-sicoob-green animate-pulse";
  if (status === 'degraded') return "bg-amber-500 animate-pulse";
  return "bg-destructive animate-ping";
}

interface HealthOverviewProps {
  health: AppHealthStatus;
  windowMinutes: HealthWindow;
  setWindowMinutes: Dispatch<SetStateAction<HealthWindow>>;
  isFetching: boolean;
  refetch: () => unknown;
}

function HealthOverview({ health, windowMinutes, setWindowMinutes, isFetching, refetch }: HealthOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 border-border/40 bg-gradient-to-br from-card to-muted/20 overflow-hidden relative">
        <div className="absolute -right-12 -top-12 opacity-5 rotate-12">
          <Heart className="h-48 w-48 text-sicoob-green" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-sicoob-green" />
                Ecossistema Sicoob Live
              </CardTitle>
              <CardDescription className="text-xs">Diagnóstico sistêmico em tempo real [OND-018-HEALTH]</CardDescription>
            </div>
            <Badge variant="outline" className={cn(
              "h-6 px-3 gap-1.5 font-bold animate-in fade-in zoom-in duration-500",
              healthBadgeClass(health.status),
            )}>
              <div className={cn("h-2 w-2 rounded-full", healthDotClass(health.status))} />
              {health.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Latência Média</p>
              <p className="text-2xl font-display font-bold tabular-nums">{health.latency}ms</p>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((health.latency / 1000) * 100, 100)}%` }}
                  className={cn("h-full", health.latency > 500 ? "bg-amber-500" : "bg-sicoob-green")} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Taxa de Erro</p>
              <p className="text-2xl font-display font-bold tabular-nums">{health.errorRate}%</p>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(health.errorRate * 5, 100)}%` }}
                  className={cn("h-full", health.errorRate > 5 ? "bg-destructive" : "bg-sicoob-green")} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Uptime Sessão</p>
              <p className="text-2xl font-display font-bold tabular-nums">{Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s</p>
              <p className="text-[9px] text-muted-foreground italic">Desde o carregamento inicial</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/40 flex flex-col justify-between p-4">
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-sicoob-green" /> Selo de Integridade OND-018
          </h3>
          <div className="p-3 rounded-lg bg-sicoob-green/5 border border-sicoob-green/10 flex items-start gap-3">
            <Zap className="h-4 w-4 text-sicoob-green shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-sicoob-green-dark">Otimizações Ativas</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Interceptação de Fetch, Cache Inteligente e Validação BPMN em conformidade.</p>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
          <ToggleGroup type="single" value={String(windowMinutes)}
            onValueChange={(value) => { if (value) setWindowMinutes(Number(value) as HealthWindow); }}
            size="sm" className="scale-90">
            {WINDOW_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={String(option.value)} className="text-xs h-7 px-2">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-sicoob-green" onClick={refetch} disabled={isFetching}>
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isFetching && "animate-spin")} /> Sync
          </Button>
        </div>
      </Card>
    </div>
  );
}

type KpiTone = 'muted' | 'warning' | 'destructive';

interface KpiGridProps {
  isLoading: boolean;
  kpis: AppHealthKpis | undefined;
  windowMinutes: HealthWindow;
  tone4xx: KpiTone;
  tone5xx: KpiTone;
}

function KpiGrid({ isLoading, kpis, windowMinutes, tone4xx, tone5xx }: KpiGridProps) {
  if (isLoading || !kpis) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard icon={<Gauge className="h-5 w-5" />} label="Req/min" value={kpis.req_per_min.toLocaleString('pt-BR')}
        sub={`${kpis.total.toLocaleString('pt-BR')} eventos · janela ${windowMinutes}min`} />
      <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="% 4xx" value={`${kpis.pct_4xx.toFixed(2)}%`}
        tone={tone4xx} sub="Erros de cliente" />
      <KpiCard icon={<Zap className="h-5 w-5" />} label="% 5xx" value={`${kpis.pct_5xx.toFixed(2)}%`}
        tone={tone5xx} sub="Erros de servidor" />
      <KpiCard icon={<Timer className="h-5 w-5" />} label="Latência p95" value={fmtMs(kpis.p95_ms)}
        sub={`p99: ${fmtMs(kpis.p99_ms)}`} />
    </div>
  );
}

interface RequestLookupCardProps {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  loading: boolean;
  result: RequestIdLookup | null;
  onLookup: () => Promise<void>;
}

function RequestLookupCard({ query, setQuery, loading, result, onLookup }: RequestLookupCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" /> Lookup por X-Request-Id
      </CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input aria-label="Request ID para consulta" placeholder="Cole o request-id (ex: 2c5b…-uuid)" value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void onLookup(); }}
            data-testid="app-health-request-id-input" className="font-mono text-xs" />
          <Button onClick={onLookup} disabled={loading || !query.trim()}>Buscar</Button>
        </div>
        {result && <LookupResult result={result} />}
      </CardContent>
    </Card>
  );
}

function LookupResult({ result }: { result: RequestIdLookup }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        <strong>{result.event_count}</strong> evento(s) correlacionado(s) — request_id:{' '}
        <code className="font-mono">{result.request_id}</code>
      </div>
      {result.event_count > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/40"><tr className="text-left">
              <th className="px-2 py-1.5">Hora</th><th className="px-2 py-1.5">Source</th>
              <th className="px-2 py-1.5">Dir</th><th className="px-2 py-1.5">Endpoint</th>
              <th className="px-2 py-1.5 text-right">Status</th><th className="px-2 py-1.5 text-right">Dur</th>
              <th className="px-2 py-1.5">Erro</th>
            </tr></thead>
            <tbody>{result.webhook_events.map((event, index) => (
              <tr key={index} className="border-t border-border/40">
                <td className="px-2 py-1.5 font-mono whitespace-nowrap">{format(new Date(event.occurred_at), 'HH:mm:ss.SSS')}</td>
                <td className="px-2 py-1.5">{event.source}</td><td className="px-2 py-1.5">{event.direction}</td>
                <td className="px-2 py-1.5 max-w-[280px] truncate" title={event.endpoint ?? ''}>{event.endpoint ?? '—'}</td>
                <td className="px-2 py-1.5 text-right"><StatusBadge status={event.http_status} success={event.success} /></td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtMs(event.duration_ms)}</td>
                <td className="px-2 py-1.5 text-destructive max-w-[260px] truncate" title={event.error_message ?? ''}>
                  {event.error_class || event.error_message || '—'}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface HealthTablesProps {
  data: AppHealthSummary | undefined;
  isLoading: boolean;
  slowQueries: SlowQueryRow[];
  isLoadingSlow: boolean;
}

function HealthTables({ data, isLoading, slowQueries, isLoadingSlow }: HealthTablesProps) {
  return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Top rotas por erro */}
        {(<Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Top rotas por erro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5">Endpoint</th>
                    <th className="px-2 py-1.5 text-right">4xx</th>
                    <th className="px-2 py-1.5 text-right">5xx</th>
                    <th className="px-2 py-1.5 text-right">Taxa</th>
                  </tr>
                </thead>
                <tbody><RouteErrorRows loading={isLoading} rows={data?.top_routes_by_error ?? []} /></tbody>
              </table>
            </div>
          </CardContent>
        </Card>)}

        {/* Webhooks por source */}
        {(<Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              Webhooks (source × direction)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5">Source</th>
                    <th className="px-2 py-1.5 text-right">Total</th>
                    <th className="px-2 py-1.5 text-right">Falhas</th>
                    <th className="px-2 py-1.5 text-right">p95</th>
                  </tr>
                </thead>
                <tbody><WebhookRows loading={isLoading} rows={data?.webhooks_by_source ?? []} /></tbody>
              </table>
            </div>
          </CardContent>
        </Card>)}

        {/* Edges por latência */}
        {(<Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-warning" />
              Edge functions (latência)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5">Edge fn</th>
                    <th className="px-2 py-1.5 text-right">p50</th>
                    <th className="px-2 py-1.5 text-right">p95</th>
                    <th className="px-2 py-1.5 text-right">p99</th>
                  </tr>
                </thead>
                <tbody><EdgeLatencyRows loading={isLoading} rows={data?.edges_by_latency ?? []} /></tbody>
              </table>
            </div>
          </CardContent>
        </Card>)}

        {/* Top Slow Queries (p95) */}
        {(<Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Top Queries Lentas (p95)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5">Op/Tabela</th>
                    <th className="px-2 py-1.5 text-right">Count</th>
                    <th className="px-2 py-1.5 text-right">Avg</th>
                    <th className="px-2 py-1.5 text-right">p95</th>
                  </tr>
                </thead>
                <tbody><SlowQueryRows loading={isLoadingSlow} rows={slowQueries} /></tbody>
              </table>
            </div>
          </CardContent>
        </Card>)}
      </div>
  );
}

function EmptyTableRow({ loading, message }: { loading: boolean; message: string }) {
  if (loading) return <tr><td colSpan={4} className="p-3"><Skeleton className="h-20 w-full" /></td></tr>;
  return <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">{message}</td></tr>;
}

function RouteErrorRows({ loading, rows }: { loading: boolean; rows: RouteErrorRow[] }) {
  if (loading || rows.length === 0) return <EmptyTableRow loading={loading} message="Sem erros na janela" />;
  return <>{rows.map((row, index) => (
    <tr key={index} className="border-t border-border/40">
      <td className="px-2 py-1.5 max-w-[220px] truncate" title={row.endpoint}>
        {row.endpoint}<span className="text-[10px] text-muted-foreground ml-1">({row.direction})</span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{row.count_4xx}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-destructive font-semibold">{row.count_5xx}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        <Badge variant={row.error_rate_pct >= 10 ? 'destructive' : 'secondary'} className="text-[10px]">
          {row.error_rate_pct.toFixed(1)}%
        </Badge>
      </td>
    </tr>
  ))}</>;
}

function WebhookRows({ loading, rows }: { loading: boolean; rows: WebhookSourceRow[] }) {
  if (loading || rows.length === 0) return <EmptyTableRow loading={loading} message="Sem webhooks na janela" />;
  return <>{rows.map((row, index) => (
    <tr key={index} className="border-t border-border/40">
      <td className="px-2 py-1.5">{row.source}<span className="text-[10px] text-muted-foreground ml-1">({row.direction})</span></td>
      <td className="px-2 py-1.5 text-right tabular-nums">{row.total}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        <span className={cn(row.failures > 0 && DESTRUCTIVE_METRIC_TEXT)}>{row.failures}</span>
        <span className="text-[10px] text-muted-foreground ml-1">({row.failure_rate_pct.toFixed(1)}%)</span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMs(row.p95_ms)}</td>
    </tr>
  ))}</>;
}

function edgeLatencyClass(p95: number): string | undefined {
  if (p95 >= 2000) return DESTRUCTIVE_METRIC_TEXT;
  if (p95 >= 1000) return WARNING_TEXT;
  return undefined;
}

function EdgeLatencyRows({ loading, rows }: { loading: boolean; rows: EdgeLatencyRow[] }) {
  if (loading || rows.length === 0) return <EmptyTableRow loading={loading} message="Sem dados na janela" />;
  return <>{rows.map((row, index) => (
    <tr key={index} className="border-t border-border/40">
      <td className="px-2 py-1.5 max-w-[180px] truncate" title={row.edge_function}>
        {row.edge_function}<span className="text-[10px] text-muted-foreground ml-1">({row.total})</span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMs(row.p50_ms)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums"><span className={edgeLatencyClass(row.p95_ms)}>{fmtMs(row.p95_ms)}</span></td>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMs(row.p99_ms)}</td>
    </tr>
  ))}</>;
}

function SlowQueryRows({ loading, rows }: { loading: boolean; rows: SlowQueryRow[] }) {
  if (loading || rows.length === 0) return <EmptyTableRow loading={loading} message="Sem dados de query" />;
  return <>{rows.map((row, index) => (
    <tr key={index} className="border-t border-border/40">
      <td className="px-2 py-1.5 max-w-[160px] truncate font-mono" title={row.operation}>{row.operation}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{row.count}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMs(row.avg_ms)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        <span className={row.p95_ms >= 500 ? DESTRUCTIVE_METRIC_TEXT : WARNING_TEXT}>{fmtMs(row.p95_ms)}</span>
      </td>
    </tr>
  ))}</>;
}

// ----------------------------------------------------------------------------
function KpiCard({
  icon, label, value, sub, tone = 'muted',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: 'muted' | 'warning' | 'destructive';
}) {
  return (
    <Card className={cn(
      'border-[1.5px] transition-colors',
      tone === 'destructive' && 'border-destructive/40 bg-destructive/5',
      tone === 'warning' && 'border-warning/40 bg-warning/5',
    )}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          tone === 'destructive' && 'bg-destructive/15 text-destructive',
          tone === 'warning' && 'bg-warning/15 text-warning',
          tone === 'muted' && 'bg-muted text-muted-foreground',
        )}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn(
            'font-display text-2xl font-bold tabular-nums leading-tight truncate',
            tone === 'destructive' && 'text-destructive',
            tone === 'warning' && 'text-warning',
          )}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, success }: { status: number | null; success: boolean }) {
  if (isNullish(status)) {
    return <Badge variant="secondary" className="text-[10px]">{success ? 'ok' : 'fail'}</Badge>;
  }
  const variant: 'default' | 'destructive' | 'secondary' =
    status >= 500 ? 'destructive' : status >= 400 ? 'destructive' : 'secondary';
  return <Badge variant={variant} className="text-[10px] tabular-nums">{status}</Badge>;
}
