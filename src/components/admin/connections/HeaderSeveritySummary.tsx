/**
 * HeaderSeveritySummary — Onda 14
 *
 * Resumo compacto de severidade no Page Header, ao lado do Refresh global.
 * Mostra três pílulas P0/P1/P2 com:
 *  - Contagem associada (P0 = conexões críticas, P1 = degradação, P2 = sinal verde)
 *  - Cor por severidade (destrutivo/aviso/sucesso)
 *  - Pílula da severidade global atual em destaque (anel + leve pulse em P0/P1)
 *  - Tooltip explicando o significado de cada nível e o que está sendo contado
 *
 * Fonte: usePulseBarStatus (mesma origem da Pulse Bar — sem fetches extras).
 */
import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePulseBarStatus, type PulseSeverity } from "./usePulseBarStatus";

type Tone = "destructive" | "warning" | "success";

interface PillDef {
  level: PulseSeverity;
  icon: typeof AlertOctagon;
  label: string;
  meaning: string;
  counts: string;
  tone: Tone;
  count: number;
}

const TONE_CLASSES: Record<Tone, { bg: string; text: string; border: string; ring: string; pulse: string }> = {
  destructive: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    ring: "ring-destructive/40",
    pulse: "bg-destructive",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    ring: "ring-warning/40",
    pulse: "bg-warning",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    ring: "ring-success/40",
    pulse: "bg-success",
  },
};

function severityCounts(successRate: number | null | undefined, failing: number, disabled: number, stale: number) {
  const criticalRate = successRate !== null && successRate !== undefined && successRate < 70;
  const warningRate = successRate !== null && successRate !== undefined && successRate >= 70 && successRate < 95;
  const p0 = failing + disabled + (criticalRate ? 1 : 0);
  const p1 = stale + (warningRate ? 1 : 0);
  return { p0, p1, p2: p0 === 0 && p1 === 0 ? 1 : 0 };
}

function pillAria(pill: PillDef, active: boolean): string {
  const signal = pill.count === 1 ? "sinal" : "sinais";
  const activeWord = pill.count === 1 ? "ativo" : "ativos";
  return `${pill.label} — ${pill.count} ${signal} ${activeWord}${active ? " (severidade global atual)" : ""}`;
}

function ActivePulse({ active, level, color }: { active: boolean; level: PulseSeverity; color: string }) {
  if (!active || level === "P2") return null;
  return (
    <span className="absolute -left-0.5 -top-0.5 flex h-2 w-2" aria-hidden="true">
      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-70", color)} />
      <span className={cn("relative inline-flex rounded-full h-2 w-2", color)} />
    </span>
  );
}

function PillCounter({ loading, pill, tone }: { loading: boolean; pill: PillDef; tone: typeof TONE_CLASSES[Tone] }) {
  if (loading) return <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold bg-muted text-muted-foreground">…</span>;
  const className = pill.count > 0
    ? cn(tone.bg, tone.text, "border", tone.border)
    : "bg-muted/60 text-muted-foreground";
  return <span className={cn("ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold", className)}>{pill.count}</span>;
}

const LEVEL_NAME: Record<PulseSeverity, string> = { P0: "Crítico", P1: "Atenção", P2: "Estável" };

function SeverityPill({ current, loading, pill }: { current: PulseSeverity; loading: boolean; pill: PillDef }) {
  const active = current === pill.level;
  const muted = !active && pill.count === 0;
  const tone = TONE_CLASSES[pill.tone];
  const Icon = pill.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={pillAria(pill, active)} aria-current={active ? "true" : undefined}
          className={cn("relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            tone.border, tone.text, tone.bg, active && cn("ring-2 ring-offset-1 ring-offset-background", tone.ring),
            muted && "opacity-50 hover:opacity-100")}>
          <ActivePulse active={active} level={pill.level} color={tone.pulse} />
          <Icon className="h-3 w-3" aria-hidden="true" /><span>{pill.label}</span>
          <PillCounter loading={loading} pill={pill} tone={tone} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs font-semibold leading-tight mb-1">{pill.label} · {LEVEL_NAME[pill.level]}</p>
        <p className="text-xs leading-relaxed">{pill.meaning}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground mt-1">{pill.counts}</p>
        {active && <p className="text-[11px] leading-tight font-medium mt-1.5 pt-1.5 border-t border-border/40">Severidade global atual.</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function buildSeverityPills(counts: ReturnType<typeof severityCounts>): PillDef[] {
  return [
    { level: "P0", icon: AlertOctagon, label: "P0", meaning: "Crítico — impacto imediato no fluxo de integrações. Exige intervenção agora.",
      counts: "Conta: conexões com último teste falhando, webhooks pausados pelo circuit breaker e taxa de sucesso 24h < 70%.", tone: "destructive", count: counts.p0 },
    { level: "P1", icon: AlertTriangle, label: "P1", meaning: "Atenção — degradação visível. Monitore de perto e planeje correção.",
      counts: "Conta: credenciais sem rotação há >90 dias e taxa de sucesso 24h entre 70% e 95%.", tone: "warning", count: counts.p1 },
    { level: "P2", icon: CheckCircle2, label: "P2", meaning: "Estável — operando dentro dos limites operacionais.",
      counts: "Sinal verde quando não há sinais ativos de P0 nem P1.", tone: "success", count: counts.p2 },
  ];
}

export function HeaderSeveritySummary({ className }: { className?: string }) {
  const { data, isLoading } = usePulseBarStatus();

  // Contagens derivadas dos KPIs já calculados na Pulse Bar (sem fetch extra)
  const failingConnections = (data?.kpis.failingConnections ?? 0);
  const autoDisabled = (data?.kpis.autoDisabledWebhooks ?? 0);
  const staleSecrets = (data?.kpis.staleSecrets ?? 0);
  const successRate = (data?.kpis.successRate24h);

  const counts = severityCounts(successRate, failingConnections, autoDisabled, staleSecrets);

  const current: PulseSeverity = (data?.severity ?? "P2");

  const pills = buildSeverityPills(counts);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="group"
        aria-label="Resumo de severidade do hub de Conexões"
        className={cn("inline-flex items-center gap-1", className)}
      >
        {pills.map((pill) => <SeverityPill key={pill.level} current={current} loading={isLoading} pill={pill} />)}
      </div>
    </TooltipProvider>
  );
}
