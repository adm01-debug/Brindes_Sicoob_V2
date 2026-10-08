/**
 * PlatformFailureCards
 * --------------------------------------------------------------
 * Cards de KPIs de falhas de plataforma (503 / cold-start) do
 * external-db-bridge nas últimas N minutos.
 *
 * Estados:
 *   - Verde (success): 0 falhas na janela.
 *   - Amarelo (warning): falhas dentro do esperado (<2% taxa).
 *   - Vermelho (destructive): pico de falhas (>2% taxa) ou delta crescente.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flame, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePlatformFailureMetrics } from '@/pages/admin/telemetry/usePlatformFailureMetrics';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReactNode } from 'react';

function statusForRate(ratePct: number): 'ok' | 'warn' | 'crit' {
  if (ratePct === 0) return 'ok';
  if (ratePct < 2) return 'warn';
  return 'crit';
}

function statusClass(status: 'ok' | 'warn' | 'crit'): string {
  if (status === 'crit') return 'border-destructive/50 bg-destructive/5';
  if (status === 'warn') return 'border-yellow-500/40 bg-yellow-500/5';
  return 'border-emerald-500/30 bg-emerald-500/5';
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta === 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> estável
    </span>
  );
  if (delta > 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <TrendingUp className="h-3 w-3" /> +{delta} vs janela anterior
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
      <TrendingDown className="h-3 w-3" /> {delta} vs janela anterior
    </span>
  );
}

type FailureMetrics = NonNullable<ReturnType<typeof usePlatformFailureMetrics>["data"]>;

function FailureRateCard(props: { title: string; icon: typeof AlertTriangle; count: number; rate: number; children: ReactNode }) {
  const { title, count, rate, children } = props;
  const Icon = props.icon;
  const status = statusForRate(rate);
  return <Card className={statusClass(status)}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader><CardContent className="space-y-1"><div className="flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums">{count}</span><Badge variant={status === 'crit' ? 'destructive' : 'secondary'} className="text-xs">{rate.toFixed(2)}%</Badge></div>{children}</CardContent></Card>;
}

function FailureCardsContent({ data, windowMinutes }: { data: FailureMetrics; windowMinutes: number }) {
  const lastColdStart = data.lastColdStartAt ? formatDistanceToNow(new Date(data.lastColdStartAt), { addSuffix: true, locale: ptBR }) : 'nunca';
  return <div className="grid gap-3 md:grid-cols-3"><FailureRateCard title={`Falhas 503 (${windowMinutes}min)`} icon={AlertTriangle} count={data.total503} rate={data.rate503Pct}><DeltaIndicator delta={data.delta503} /></FailureRateCard><FailureRateCard title={`Cold starts (${windowMinutes}min)`} icon={Flame} count={data.totalColdStarts} rate={data.rateColdStartPct}><p className="text-xs text-muted-foreground">Último: {lastColdStart}</p></FailureRateCard><Card className="border-muted-foreground/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Volume total</CardTitle></CardHeader><CardContent className="space-y-1"><div className="text-2xl font-bold tabular-nums">{data.totalCalls.toLocaleString('pt-BR')}</div><p className="text-xs text-muted-foreground">chamadas registradas na janela</p></CardContent></Card></div>;
}

export function PlatformFailureCards({ windowMinutes = 60 }: { windowMinutes?: number }) {
  const { data, isLoading } = usePlatformFailureMetrics(windowMinutes);

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return <FailureCardsContent data={data} windowMinutes={windowMinutes} />;
}
