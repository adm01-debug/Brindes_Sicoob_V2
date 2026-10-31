/**
 * KitHealthCard — Saúde comercial do kit:
 * - Margem real (vs. histórico de kits salvos)
 * - Comparativo com média de tickets do mesmo kit_type
 * - Alerta de range competitivo (preço fora do P25-P75 histórico)
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { KitState } from '@/lib/kit-builder/types';
import { formatCurrency } from '@/lib/kit-builder';

interface KitHealthCardProps {
  kitState: KitState;
  kitQuantity: number;
  className?: string;
}

interface HistoricalRow {
  total_price: number;
  kit_type: string;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const lower = sorted[lo] ?? 0;
  const upper = sorted[hi] ?? lower;
  if (lo === hi) return lower;
  return lower + (upper - lower) * (idx - lo);
}

function calculateHealthScore(totalPrice: number, inRange: boolean, aboveRange: boolean, diffVsAvg: number) {
  if (totalPrice <= 0) return 0;
  if (inRange) return 90;
  if (aboveRange) return Math.max(40, 90 - (diffVsAvg - 20));
  return Math.max(50, 70 - Math.abs(diffVsAvg) / 2);
}

function scoreColor(score: number) {
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

function kitHealthMetrics(totalPrice: number, quantity: number, history: readonly HistoricalRow[]) {
  const sortedHistory = history.map(row => Number(row.total_price)).filter(value => value > 0).sort((a, b) => a - b);
  const average = sortedHistory.length > 0 ? sortedHistory.reduce((sum, value) => sum + value, 0) / sortedHistory.length : 0;
  const p25 = percentile(sortedHistory, 25);
  const p75 = percentile(sortedHistory, 75);
  const difference = average > 0 ? ((totalPrice - average) / average) * 100 : 0;
  const inRange = totalPrice >= p25 && totalPrice <= p75;
  const aboveRange = p75 > 0 && totalPrice > p75;
  const belowRange = p25 > 0 && totalPrice < p25 && totalPrice > 0;
  const healthScore = calculateHealthScore(totalPrice, inRange, aboveRange, difference);
  return { sortedHistory, average, p25, p75, difference, inRange, aboveRange, belowRange, healthScore, color: scoreColor(healthScore), totalRevenue: totalPrice * quantity };
}

interface HistoricalComparisonProps {
  readonly metrics: ReturnType<typeof kitHealthMetrics>;
  readonly kitType: string;
  readonly totalPrice: number;
}

function HistoricalComparison({ metrics, kitType, totalPrice }: HistoricalComparisonProps) {
  if (metrics.sortedHistory.length < 5) {
    if (totalPrice <= 0) return null;
    return <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Histórico insuficiente para comparativo competitivo.</span></div>;
  }
  const differencePrefix = metrics.difference > 0 ? '+' : '';
  return <div className="space-y-2 pt-2 border-t"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Média histórica ({kitType})</span><span className="font-medium">{formatCurrency(metrics.average)}</span></div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Faixa competitiva (P25–P75)</span><span className="font-medium">{formatCurrency(metrics.p25)} – {formatCurrency(metrics.p75)}</span></div>{metrics.inRange && totalPrice > 0 && <div className="flex items-start gap-2 rounded-md bg-success/10 p-2 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Preço dentro do range competitivo do mercado.</span></div>}{metrics.aboveRange && <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground"><TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" /><span>Acima da faixa competitiva ({differencePrefix}{metrics.difference.toFixed(0)}% vs. média). Considere reduzir itens ou ajustar margem.</span></div>}{metrics.belowRange && <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive"><TrendingDown className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Abaixo da faixa competitiva ({metrics.difference.toFixed(0)}% vs. média). Risco de margem baixa.</span></div>}</div>;
}

export function KitHealthCard({ kitState, kitQuantity, className }: KitHealthCardProps) {
  const { data: history } = useQuery({
    queryKey: ['kit-health-history', kitState.kitType],
    queryFn: async (): Promise<HistoricalRow[]> => {
      const { data, error } = await supabase
        .from('custom_kits')
        .select('total_price, kit_type')
        .eq('kit_type', kitState.kitType)
        .gt('total_price', 0)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return [];
      return (data ?? []) as HistoricalRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalPrice = kitState.totalPrice;

  // Margem aproximada — usa flag conservadora baseada na composição
  // Sem custo direto exposto: margem é estimada como razão personalização/preço (proxy)
  // Estratégia: margem ~ 1 - (custo_estimado / preço). Usamos 65% baseline.
  const estimatedCostRatio = 0.65;
  const grossMargin = totalPrice > 0 ? ((totalPrice - totalPrice * estimatedCostRatio) / totalPrice) * 100 : 0;

  const metrics = kitHealthMetrics(totalPrice, kitQuantity, history ?? []);

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Saúde do Kit
          </h3>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              metrics.color === 'success' && 'border-success text-success',
              metrics.color === 'warning' && 'border-warning text-warning',
              metrics.color === 'destructive' && 'border-destructive text-destructive'
            )}
          >
            {metrics.healthScore.toFixed(0)}/100
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/40 p-2">
            <div className="text-muted-foreground">Margem estimada</div>
            <div className="font-semibold text-foreground">{grossMargin.toFixed(0)}%</div>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <div className="text-muted-foreground">Receita ({kitQuantity}×)</div>
            <div className="font-semibold text-foreground">{formatCurrency(metrics.totalRevenue)}</div>
          </div>
        </div>

        <HistoricalComparison metrics={metrics} kitType={kitState.kitType} totalPrice={totalPrice} />
      </CardContent>
    </Card>
  );
}
