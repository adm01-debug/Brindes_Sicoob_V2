/**
 * IncidentDetailsDrawer — Onda 14
 *
 * Drawer lateral (Sheet) que mostra métricas e logs filtrados pela janela do
 * incidente (±2h em torno do timestamp). Composição:
 *
 *   1. Header: severidade, título, kind técnico, entidade afetada, janela
 *   2. Resumo de métricas (KPIs em grid 2x4): testes, falhas, taxa, latência
 *      média/p95, entregas, taxa de entregas, primeiro/último evento
 *   3. Abas "Testes de conexão" e "Entregas de webhook" com tabelas paginadas
 *      (últimos N eventos da janela), badges por status, latência colorida
 *
 * Tom de voz: híbrido com tradução (termo técnico + explicação curta entre
 * parênteses).
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Webhook,
  Database,
  Gauge,
  History,
  ArrowUpRight,
} from "lucide-react";

const SUCCESS_TEXT = "text-success";
const WARNING_TEXT = "text-warning";
const DESTRUCTIVE_TEXT = "text-destructive";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIncidentDetails } from "./useIncidentDetails";
import type { IncidentItem, IncidentSeverity } from "./useRecentIncidents";

const SEV_META: Record<
  IncidentSeverity,
  { label: string; icon: typeof AlertOctagon; cls: string; description: string }
> = {
  P0: {
    label: "P0 · Crítico",
    icon: AlertOctagon,
    cls: "bg-destructive/10 text-destructive border-destructive/30",
    description: "Severidade P0 (crítico): impacto imediato — exige intervenção agora",
  },
  P1: {
    label: "P1 · Atenção",
    icon: AlertTriangle,
    cls: "bg-warning/10 text-warning border-warning/30",
    description: "Severidade P1 (atenção): degradação visível — monitorar e planejar correção",
  },
  P2: {
    label: "P2 · Info",
    icon: Info,
    cls: "bg-muted text-muted-foreground border-border",
    description: "Severidade P2 (informacional): registro sem impacto operacional",
  },
};

interface Props {
  incident: IncidentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MetricTile({
  icon,
  label,
  value,
  tone = "default",
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "destructive";
  hint?: string;
}) {
  const Icon = icon;
  const cls = {
    default: { icon: "text-muted-foreground", value: "text-foreground" },
    success: { icon: SUCCESS_TEXT, value: SUCCESS_TEXT },
    warning: { icon: WARNING_TEXT, value: WARNING_TEXT },
    destructive: { icon: DESTRUCTIVE_TEXT, value: DESTRUCTIVE_TEXT },
  }[tone];
  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", cls.icon)} aria-hidden="true" />
        <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
      </div>
      <p className={cn("text-base font-bold tabular-nums leading-tight", cls.value)}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function StatusPill({ ok, code }: { ok: boolean; code: number | null }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] gap-1 h-5 px-1.5",
        ok
          ? "bg-success/10 text-success border-success/30"
          : "bg-destructive/10 text-destructive border-destructive/30",
      )}
    >
      {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {code ?? (ok ? "OK" : "ERR")}
    </Badge>
  );
}

function LatencyCell({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-muted-foreground text-xs">—</span>;
  const tone = ms < 500 ? SUCCESS_TEXT : ms < 1500 ? WARNING_TEXT : DESTRUCTIVE_TEXT;
  return <span className={cn("text-xs font-mono tabular-nums", tone)}>{ms}ms</span>;
}

type IncidentData = NonNullable<ReturnType<typeof useIncidentDetails>["data"]>;
type TestLog = IncidentData["tests"][number];
type DeliveryLog = IncidentData["deliveries"][number];

function IncidentHeader({ data, incident }: { data?: IncidentData; incident: IncidentItem }) {
  const sev = SEV_META[incident.severity];
  const SevIcon = sev.icon;
  const occurred = new Date(incident.occurredAt);
  return (
    <SheetHeader className="space-y-2 pb-3 border-b border-border/40">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn("gap-1 font-semibold text-[11px]", sev.cls)}><SevIcon className="h-3 w-3" />{sev.label}</Badge>
        {incident.kind && <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">{incident.kind}</Badge>}
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{incident.source === "notification" ? "alerta consolidado" : "evento bruto"}</Badge>
      </div>
      <SheetTitle className="text-base leading-tight">{incident.title}</SheetTitle>
      <SheetDescription id="incident-details-desc" className="text-xs">{incident.subtitle}</SheetDescription>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(occurred, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
        <span>·</span><span>{formatDistanceToNow(occurred, { locale: ptBR, addSuffix: true })}</span>
        {data?.entity && <><span>·</span><span className="inline-flex items-center gap-1">
          {data.entity.kind === "webhook" ? <Webhook className="h-3 w-3" /> : <Database className="h-3 w-3" />}
          <span className="font-medium text-foreground">{data.entity.name}</span>
          {data.entity.type && <span className="text-muted-foreground">({data.entity.type})</span>}
        </span></>}
      </div>
    </SheetHeader>
  );
}

function rateTone(rate: number | null): "default" | "success" | "warning" | "destructive" {
  if (rate === null) return "default";
  if (rate >= 95) return "success";
  if (rate >= 70) return "warning";
  return "destructive";
}

function MetricsGrid({ data }: { data: IncidentData }) {
  const { metrics } = data;
  const lastEvent = metrics.lastEventAt
    ? formatDistanceToNow(new Date(metrics.lastEventAt), { locale: ptBR, addSuffix: true })
    : "—";
  const deliveryHint = metrics.deliverySuccessRate === null
    ? "sem entregas na janela"
    : `${metrics.deliverySuccessRate.toFixed(1)}% sucesso`;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetricTile icon={Activity} label="Testes (runs)" value={String(metrics.testCount)} />
      <MetricTile icon={CheckCircle2} label="Sucesso" value={String(metrics.testSuccess)} tone={metrics.testSuccess > 0 ? "success" : "default"} />
      <MetricTile icon={XCircle} label="Falhas" value={String(metrics.testFail)} tone={metrics.testFail > 0 ? "destructive" : "default"} />
      <MetricTile icon={Gauge} label="Taxa de sucesso" value={metrics.testSuccessRate === null ? "—" : `${metrics.testSuccessRate.toFixed(1)}%`} tone={rateTone(metrics.testSuccessRate)} />
      <MetricTile icon={Clock} label="Latência média" value={metrics.testAvgLatency === null ? "—" : `${metrics.testAvgLatency}ms`} hint="média aritmética dos testes na janela" />
      <MetricTile icon={Clock} label="P95 (95º percentil)" value={metrics.testP95Latency === null ? "—" : `${metrics.testP95Latency}ms`} hint="95% das requisições foram mais rápidas que esse valor" />
      <MetricTile icon={Webhook} label="Entregas (webhook)" value={String(metrics.deliveryCount)} hint={deliveryHint} />
      <MetricTile icon={History} label="Último evento" value={lastEvent} />
    </div>
  );
}

function MetricsSection({ data, loading }: { data?: IncidentData; loading: boolean }) {
  return (
    <section aria-label="Métricas da janela do incidente" className="py-4 space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />Métricas na janela (±2h em torno do incidente)</h3>
        {data?.metrics && <span className="text-[10px] text-muted-foreground tabular-nums">{format(new Date(data.metrics.windowStart), "HH:mm", { locale: ptBR })} — {format(new Date(data.metrics.windowEnd), "HH:mm", { locale: ptBR })}</span>}
      </header>
      {loading || !data
        ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}</div>
        : <MetricsGrid data={data} />}
    </section>
  );
}

function TestError({ test }: { test: TestLog }) {
  if (!test.error_message) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip><TooltipTrigger asChild><span className="truncate block text-[10px] text-destructive">
      {test.error_kind && <span className="font-mono">[{test.error_kind}]</span>} {test.error_message}
    </span></TooltipTrigger><TooltipContent className="max-w-sm"><p className="text-xs whitespace-pre-wrap">{test.error_message}</p></TooltipContent></Tooltip>
  );
}

function TestLogs({ loading, tests }: { loading: boolean; tests?: TestLog[] }) {
  if (loading) return <Skeleton className="h-40" />;
  if (!tests?.length) return <p className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-lg">Nenhum teste registrado nesta janela.</p>;
  return (
    <div className="border rounded-lg overflow-hidden"><Table>
      <TableHeader><TableRow className="text-[10px]"><TableHead className="h-8">Quando</TableHead><TableHead className="h-8">Status</TableHead><TableHead className="h-8">Latência</TableHead><TableHead className="h-8">Origem</TableHead><TableHead className="h-8">Erro</TableHead></TableRow></TableHeader>
      <TableBody>{tests.slice(0, 50).map((test) => <TableRow key={test.id} className="text-xs">
        <TableCell className="font-mono tabular-nums whitespace-nowrap py-1.5"><Tooltip><TooltipTrigger asChild><span>{format(new Date(test.tested_at), "HH:mm:ss", { locale: ptBR })}</span></TooltipTrigger><TooltipContent>{format(new Date(test.tested_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</TooltipContent></Tooltip></TableCell>
        <TableCell className="py-1.5"><StatusPill ok={test.success} code={test.status_code} /></TableCell>
        <TableCell className="py-1.5"><LatencyCell ms={test.latency_ms} />{test.attempts > 1 && <span className="ml-1 text-[10px] text-muted-foreground">×{test.attempts}</span>}</TableCell>
        <TableCell className="py-1.5"><span className="text-[10px] text-muted-foreground capitalize">{test.triggered_by}</span></TableCell>
        <TableCell className="py-1.5 max-w-[200px]"><TestError test={test} /></TableCell>
      </TableRow>)}</TableBody>
    </Table></div>
  );
}

function DeliveryError({ delivery }: { delivery: DeliveryLog }) {
  if (!delivery.error_message) return <span className="text-muted-foreground">—</span>;
  return <Tooltip><TooltipTrigger asChild><span className="truncate block text-[10px] text-destructive">{delivery.error_message}</span></TooltipTrigger><TooltipContent className="max-w-sm"><p className="text-xs whitespace-pre-wrap">{delivery.error_message}</p></TooltipContent></Tooltip>;
}

function DeliveryLogs({ deliveries, loading }: { deliveries?: DeliveryLog[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-40" />;
  if (!deliveries?.length) return <p className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-lg">Nenhuma entrega de webhook nesta janela.</p>;
  return (
    <div className="border rounded-lg overflow-hidden"><Table>
      <TableHeader><TableRow className="text-[10px]"><TableHead className="h-8">Quando</TableHead><TableHead className="h-8">Evento</TableHead><TableHead className="h-8">Status</TableHead><TableHead className="h-8">Tentativa</TableHead><TableHead className="h-8">Erro</TableHead></TableRow></TableHeader>
      <TableBody>{deliveries.slice(0, 50).map((delivery) => <TableRow key={delivery.id} className="text-xs">
        <TableCell className="font-mono tabular-nums whitespace-nowrap py-1.5">{format(new Date(delivery.delivered_at), "HH:mm:ss", { locale: ptBR })}</TableCell>
        <TableCell className="py-1.5 font-mono text-[10px]">{delivery.event}</TableCell><TableCell className="py-1.5"><StatusPill ok={delivery.success} code={delivery.status_code} /></TableCell>
        <TableCell className="py-1.5 text-[10px] text-muted-foreground">#{delivery.attempt}</TableCell><TableCell className="py-1.5 max-w-[200px]"><DeliveryError delivery={delivery} /></TableCell>
      </TableRow>)}</TableBody>
    </Table></div>
  );
}

function IncidentLogs({ data, incident, loading }: { data?: IncidentData; incident: IncidentItem; loading: boolean }) {
  return (
    <section aria-label="Logs filtrados pela janela" className="space-y-3 pb-6">
      <Tabs defaultValue="tests">
        <TabsList className="h-8"><TabsTrigger value="tests" className="text-xs h-7">Testes ({data?.tests.length ?? 0})</TabsTrigger><TabsTrigger value="deliveries" className="text-xs h-7">Entregas ({data?.deliveries.length ?? 0})</TabsTrigger></TabsList>
        <TabsContent value="tests" className="mt-2"><TestLogs loading={loading} tests={data?.tests} /></TabsContent>
        <TabsContent value="deliveries" className="mt-2"><DeliveryLogs loading={loading} deliveries={data?.deliveries} /></TabsContent>
      </Tabs>
      {incident.actionUrl && <a href={incident.actionUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">Abrir alerta original <ArrowUpRight className="h-3 w-3" /></a>}
    </section>
  );
}

export function IncidentDetailsDrawer({ incident, open, onOpenChange }: Props) {
  const { data, isLoading } = useIncidentDetails(
    (incident
      ? {
          occurredAt: incident.occurredAt,
          entityId: incident.entityId,
          kind: incident.kind,
          windowMinutes: 120,
        }
      : null),
  );

  if (!incident) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        aria-describedby="incident-details-desc"
      >
        <TooltipProvider delayDuration={150}>
          <IncidentHeader data={data} incident={incident} />
          <MetricsSection data={data} loading={isLoading} />
          <IncidentLogs data={data} incident={incident} loading={isLoading} />
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}
