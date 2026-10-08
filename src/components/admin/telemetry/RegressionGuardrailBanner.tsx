/**
 * RegressionGuardrailBanner
 * --------------------------------------------------------------
 * Top-of-page alert that surfaces the result of the automated KPI
 * regression check (RPC check_telemetry_regression).
 *
 * Visual states:
 *   - regression → destructive banner (vermelho), motivos + deltas
 *   - warning    → warning banner (amarelo)
 *   - ok         → faixa discreta success
 *   - insufficient_data → muted info
 *   - error      → muted info com mensagem
 *
 * Pure presentation. Dispara toast crítico (sonner) na primeira detecção
 * de regression para garantir que o admin não passe despercebido.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRegressionGuardrail, type GuardrailStatus } from '@/pages/admin/telemetry/useRegressionGuardrail';

const STATUS_META: Record<GuardrailStatus, {
  tone: 'destructive' | 'warning' | 'success' | 'muted';
  icon: typeof AlertOctagon;
  label: string;
}> = {
  regression:        { tone: 'destructive', icon: AlertOctagon,   label: 'Regressão crítica detectada' },
  warning:           { tone: 'warning',     icon: AlertTriangle,  label: 'Aviso de degradação' },
  ok:                { tone: 'success',     icon: CheckCircle2,   label: 'KPIs dentro do esperado' },
  insufficient_data: { tone: 'muted',       icon: Info,           label: 'Aguardando amostras suficientes' },
  error:             { tone: 'muted',       icon: Info,           label: 'Falha ao consultar guardrail' },
};

type Tone = (typeof STATUS_META)[GuardrailStatus]['tone'];

function cardToneClass(tone: Tone): string {
  if (tone === 'destructive') return 'border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20';
  if (tone === 'warning') return 'border-warning/50 bg-warning/5';
  if (tone === 'success') return 'border-success/40 bg-success/5';
  return 'border-border bg-muted/20';
}

function iconToneClass(tone: Tone): string {
  if (tone === 'destructive') return 'bg-destructive/15 text-destructive';
  if (tone === 'warning') return 'bg-warning/15 text-warning';
  if (tone === 'success') return 'bg-success/15 text-success';
  return 'bg-muted text-muted-foreground';
}

function badgeToneClass(tone: Tone): string | undefined {
  if (tone === 'destructive') return 'border-destructive/40 text-destructive';
  if (tone === 'warning') return 'border-warning/40 text-warning';
  if (tone === 'success') return 'border-success/40 text-success';
  return undefined;
}

function reasonToneClass(tone: Tone): string | undefined {
  if (tone === 'destructive') return 'text-destructive/90';
  if (tone === 'warning') return 'text-warning-foreground';
  return undefined;
}

type GuardrailState = ReturnType<typeof useRegressionGuardrail>;

function GuardrailReportCard({ state }: { state: GuardrailState }) {
  const meta = STATUS_META[state.report.status];
  const Icon = meta.icon;
  const report = state.report;
  return <Card className={cn('border-[1.5px] transition-colors', cardToneClass(meta.tone))}><CardContent className="p-4"><div className="flex items-start gap-3"><div className={cn('p-2.5 rounded-lg shrink-0', iconToneClass(meta.tone))}><Icon className="h-5 w-5" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-display text-base font-semibold">{meta.label}</h3><Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', badgeToneClass(meta.tone))}><ShieldAlert className="h-3 w-3 mr-1" />Guardrail automático</Badge>{state.lastCheckedAt > 0 && <span className="text-[10px] text-muted-foreground">Verificado {new Date(state.lastCheckedAt).toLocaleTimeString('pt-BR')}</span>}</div>{report.reasons.length > 0 && <ul className="mt-2 space-y-1">{report.reasons.map(reason => <li key={reason} className={cn('text-sm flex items-start gap-2', reasonToneClass(meta.tone))}><span className="mt-1.5 h-1 w-1 rounded-full bg-current shrink-0" /><span>{reason}</span></li>)}</ul>}{report.current && report.baseline && <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><MetricDelta label="P95 latência" current={`${report.current.p95_ms}ms`} baseline={`${report.baseline.p95_ms}ms`} deltaPct={report.deltas?.p95_delta_pct} inverted /><MetricDelta label="Taxa de erro" current={`${report.current.error_rate_pct}%`} baseline={`${report.baseline.error_rate_pct}%`} deltaPct={report.deltas?.error_rate_delta_pp} unit="pp" inverted /><MetricDelta label="Queries >8s" current={String(report.current.very_slow)} baseline={String(report.baseline.very_slow)} deltaPct={report.deltas?.very_slow_ratio ? Math.round((report.deltas.very_slow_ratio - 1) * 100) : undefined} inverted /></div>}</div><Button variant="ghost" size="sm" onClick={() => state.refetch()} disabled={state.isLoading}><RefreshCw className={cn('h-3.5 w-3.5', state.isLoading && 'animate-spin')} /></Button></div></CardContent></Card>;
}

export function RegressionGuardrailBanner() {
  const state = useRegressionGuardrail();
  const lastNotifiedStatus = useRef<GuardrailStatus | null>(null);

  // Notificação push uma única vez por transição para 'regression'.
  useEffect(() => {
    if (state.report.status === 'regression' && lastNotifiedStatus.current !== 'regression') {
      toast.error('Regressão crítica de performance', {
        description: state.report.reasons[0] ?? 'KPIs degradaram além do limite seguro.',
        duration: 10_000,
      });
    }
    lastNotifiedStatus.current = state.report.status;
  }, [state.report.status, state.report.reasons]);

  return <GuardrailReportCard state={state} />;
}

interface MetricDeltaProps {
  label: string;
  current: string;
  baseline: string;
  deltaPct?: number;
  unit?: string;
  /** Quando true, valores positivos são ruins (latência, erros). */
  inverted?: boolean;
}

function deltaPresentation(deltaPct: number | undefined, inverted: boolean | undefined) {
  if (typeof deltaPct !== 'number' || Number.isNaN(deltaPct)) return null;
  if (deltaPct === 0) return { delta: deltaPct, className: 'text-muted-foreground' };
  const isBad = inverted === true ? deltaPct > 0 : deltaPct < 0;
  return { delta: deltaPct, className: isBad ? 'text-destructive' : 'text-success' };
}

function MetricDelta({ label, current, baseline, deltaPct, unit = '%', inverted }: MetricDeltaProps) {
  const presentation = deltaPresentation(deltaPct, inverted);

  return (
    (<div className="rounded-md border border-border/40 bg-background/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{current}</p>
      <p className="text-[10px] text-muted-foreground">
        baseline: <span className="font-mono">{baseline}</span>
      </p>
      {presentation && (
        <p
          className={cn(
            'text-[10px] font-mono tabular-nums mt-0.5',
            presentation.className,
          )}
        >
          {presentation.delta > 0 ? '+' : ''}{presentation.delta}{unit}
        </p>
      )}
    </div>)
  );
}
