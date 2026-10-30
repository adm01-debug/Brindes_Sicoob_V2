/**
 * ConnectionsPulseBar — Onda 14
 *
 * Barra sticky no topo de /admin/conexoes com:
 *  - Severidade global P0/P1/P2 (Status Pulse)
 *  - Headline contextual + tooltip com motivos detalhados
 *  - 4 KPIs resumidos (Webhooks ativos, Sucesso 24h, Conexões com falha, Última entrega)
 *  - Botão de refresh manual
 *
 * Tom de voz: híbrido com tradução (termo técnico + explicação curta).
 */
import { AlertTriangle, AlertOctagon, CheckCircle2, RefreshCw, Webhook, Clock, XCircle, type LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePulseBarStatus, type PulseSeverity } from "./usePulseBarStatus";
import { useExplainMode } from "./ExplainModeContext";
import { KpiExplainTooltip, type KpiExplain } from "./KpiExplainTooltip";

const SEVERITY_META: Record<
  PulseSeverity,
  { label: string; tone: string; icon: typeof CheckCircle2; pulseColor: string; description: string }
> = {
  P0: {
    label: "P0 · Crítico",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
    icon: AlertOctagon,
    pulseColor: "bg-destructive",
    description: "Severidade P0 (crítico): impacto imediato no fluxo de integrações — exige intervenção agora",
  },
  P1: {
    label: "P1 · Atenção",
    tone: "bg-warning/10 text-warning border-warning/30",
    icon: AlertTriangle,
    pulseColor: "bg-warning",
    description: "Severidade P1 (atenção): degradação visível — monitorar e planejar correção",
  },
  P2: {
    label: "P2 · Estável",
    tone: "bg-success/10 text-success border-success/30",
    icon: CheckCircle2,
    pulseColor: "bg-success",
    description: "Severidade P2 (estável): tudo dentro dos limites operacionais",
  },
};

interface MiniKpiProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "destructive";
  tooltip?: string;
  explain?: KpiExplain;
}

function MiniKpi({ icon, label, value, tone = "default", tooltip, explain }: MiniKpiProps) {
  const Icon = icon;
  const { enabled: explainOn } = useExplainMode();
  const iconCls = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];
  const valueCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  const content = (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/60 border min-w-0 transition-colors",
        explainOn && explain ? "border-primary/40 bg-primary/5" : "border-border/40",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconCls)} aria-hidden="true" />
      <div className="flex flex-col min-w-0 leading-tight">
        <span className={cn("text-xs font-semibold tabular-nums truncate", valueCls)}>{value}</span>
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      </div>
      {explainOn && explain && (
        <KpiExplainTooltip explain={explain} className="ml-0.5 shrink-0" />
      )}
    </div>
  );

  if (!tooltip) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-left">{content}</button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs leading-relaxed">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type PulseData = ReturnType<typeof usePulseBarStatus>["data"];
type SeverityMeta = (typeof SEVERITY_META)[PulseSeverity];

function PulseStatus({ data, meta, severity }: { data: PulseData; meta: SeverityMeta; severity: PulseSeverity }) {
  const Icon = meta.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            {severity !== "P2" && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", meta.pulseColor)} />}
            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", meta.pulseColor)} />
          </span>
          <Badge variant="outline" className={cn("gap-1 font-semibold text-[11px]", meta.tone)}><Icon className="h-3 w-3" />{meta.label}</Badge>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{data?.headline ?? "Carregando status…"}</p>
            {data && data.reasons.length > 0 && <p className="text-[11px] text-muted-foreground leading-tight truncate">{data.reasons[0]}{data.reasons.length > 1 && ` · +${data.reasons.length - 1}`}</p>}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <p className="text-xs font-semibold mb-1">{meta.description}</p>
        {data && data.reasons.length > 0 ? <ul className="text-xs space-y-1 list-disc pl-4">{data.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : <p className="text-xs text-muted-foreground">Sem alertas ativos no momento.</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function successTone(rate: number | null): "default" | "success" | "warning" | "destructive" {
  if (rate === null) return "default";
  if (rate >= 95) return "success";
  if (rate >= 70) return "warning";
  return "destructive";
}

function pulseValues(data: PulseData) {
  if (!data) return { webhooks: "—", success: "—", successLabel: "Sucesso 24h", failing: "—", last: "—" };
  const rate = data.kpis.successRate24h;
  const last = data.kpis.lastSuccessAt
    ? formatDistanceToNow(new Date(data.kpis.lastSuccessAt), { locale: ptBR, addSuffix: true })
    : "—";
  return {
    webhooks: `${data.kpis.activeWebhooks}/${data.kpis.totalWebhooks}`,
    success: rate === null ? "—" : `${rate.toFixed(1)}%`,
    successLabel: `Sucesso 24h · ${data.kpis.totalDeliveries24h} envios`,
    failing: String(data.kpis.failingConnections),
    last,
  };
}

function pulseTones(data: PulseData) {
  if (!data) return { rate: null, failing: "success" as const, webhooks: "default" as const };
  return {
    rate: data.kpis.successRate24h,
    failing: data.kpis.failingConnections > 0 ? "destructive" as const : "success" as const,
    webhooks: data.kpis.activeWebhooks > 0 ? "success" as const : "default" as const,
  };
}

function PulseKpis({ data, isFetching, refetch }: { data: PulseData; isFetching: boolean; refetch: () => void }) {
  const tones = pulseTones(data);
  const values = pulseValues(data);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <MiniKpi icon={Webhook} label="Webhooks ativos" value={values.webhooks} tone={tones.webhooks}
        tooltip="Webhooks de saída habilitados (active=true) sobre o total cadastrado"
        explain={{ summary: "Webhooks ativos vs. total cadastrado", formula: "count(active=true) / count(*)", window: "Snapshot atual (sem janela temporal)", source: "outbound_webhooks.active", threshold: "Esperado: ≥1 ativo se há integrações em uso" }} />
      <MiniKpi icon={CheckCircle2} label={values.successLabel} value={values.success} tone={successTone(tones.rate)}
        tooltip="Taxa de entrega bem-sucedida (HTTP 2xx) nas últimas 24 horas. Alvo ≥95%."
        explain={{ summary: "Taxa de entregas de webhook bem-sucedidas", formula: "count(success=true) / count(*) × 100", window: "Últimas 24h (delivered_at ≥ now()-24h)", source: "webhook_deliveries.success, .delivered_at", threshold: "≥95% verde · 70–95% atenção · <70% crítico" }} />
      <MiniKpi icon={XCircle} label="Conexões em falha" value={values.failing} tone={tones.failing}
        tooltip="Conexões cujo último teste (last_test_ok) retornou falha. Pode ser flap pontual; veja o banner de alerta para janela contínua."
        explain={{ summary: "Conexões cujo último teste de saúde falhou", formula: "count(last_test_ok = false)", window: "Último teste registrado (auto-test a cada N min ou manual)", source: "external_connections.last_test_ok", threshold: "0 ideal · ≥1 sustentado pela janela vira P0" }} />
      <MiniKpi icon={Clock} label="Última entrega OK" value={values.last}
        tooltip="Quando ocorreu a última entrega de webhook bem-sucedida (latest delivered_at com success=true)"
        explain={{ summary: "Heartbeat: última entrega de webhook com sucesso", formula: "max(delivered_at) where success = true", window: "Histórico completo (sem corte temporal)", source: "webhook_deliveries.delivered_at, .success", threshold: "Recente (<1h) saudável · >24h sugere fluxo parado" }} />
      <button type="button" onClick={refetch}
        className="ml-1 inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Atualizar status global"><RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} /><span>{isFetching ? "Atualizando…" : "Auto 60s"}</span></button>
    </div>
  );
}

export function ConnectionsPulseBar() {
  const { data, isFetching, refetch } = usePulseBarStatus();

  const severity: PulseSeverity = (data?.severity ?? "P2");
  const meta = SEVERITY_META[severity];

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="status"
        aria-live="polite"
        aria-label={(`Status global das integrações: ${meta.label}. ${data?.headline ?? ""}`)}
        className={cn(
          "sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-2.5",
          "border-b backdrop-blur-md bg-background/85 supports-[backdrop-filter]:bg-background/70",
          "transition-colors duration-300",
          (severity === "P0" && "border-destructive/30"),
          (severity === "P1" && "border-warning/30"),
          (severity === "P2" && "border-border"),
        )}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <PulseStatus data={data} meta={meta} severity={severity} />

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          <PulseKpis data={data} isFetching={isFetching} refetch={() => { void refetch(); }} />
        </div>
      </div>
    </TooltipProvider>
  );
}
