/**
 * OptimizationMetricsCards
 * --------------------------------------------------------------
 * Surfaces the impact of Wave-2 optimizations on the admin telemetry page:
 *  - Cache Hit Rate (last 24h) — hits served by the in-memory LRU on
 *    external-db-bridge versus all persisted samples.
 *  - Retries Saved (last 24h) — sum of `retry_count` avoided thanks to the
 *    fail-fast classifier (NON_RETRYABLE_PATTERNS).
 *
 * Pure presentational. Data comes from `useOptimizationMetrics`.
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gauge, ShieldCheck } from 'lucide-react';
import { useOptimizationMetrics } from '@/pages/admin/telemetry/useOptimizationMetrics';

type HitRateTone = 'muted' | 'success' | 'warning';

function hitRateTone(rate: number | null): HitRateTone {
  if (rate === null) return 'muted';
  if (rate >= 30) return 'success';
  if (rate >= 10) return 'warning';
  return 'muted';
}

function CacheHitCard({ hits, loading, rate, samples }: { hits: number; loading: boolean; rate: number | null; samples: number }) {
  const tone = hitRateTone(rate);
  const label = rate === null ? '—' : `${rate.toFixed(1)}%`;
  return (
    <Card className={cn('border-[1.5px] transition-colors', tone === 'success' && 'border-success/40 bg-success/5', tone === 'warning' && 'border-warning/40 bg-warning/5')}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', tone === 'success' && 'bg-success/15 text-success', tone === 'warning' && 'bg-warning/15 text-warning', tone === 'muted' && 'bg-muted text-muted-foreground')}><Gauge className="h-5 w-5" /></div>
        <div className="flex-1"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cache Hit Rate (24h)</p><p className="font-display text-3xl font-bold tabular-nums leading-tight">{loading ? '—' : label}</p><p className="text-[10px] text-muted-foreground mt-0.5">{hits.toLocaleString()} hits · {samples.toLocaleString()} amostras</p></div>
      </CardContent>
    </Card>
  );
}

function RetriesSavedCard({ loading, retries }: { loading: boolean; retries: number }) {
  const hasSavings = retries > 0;
  return (
    <Card className={cn('border-[1.5px] transition-colors', hasSavings && 'border-success/40 bg-success/5')}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', hasSavings ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}><ShieldCheck className="h-5 w-5" /></div>
        <div className="flex-1"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Retries Evitados (24h)</p><p className="font-display text-3xl font-bold tabular-nums leading-tight">{loading ? '—' : retries.toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-0.5">Tentativas economizadas pelo fail-fast (~700ms cada)</p></div>
      </CardContent>
    </Card>
  );
}

export function OptimizationMetricsCards() {
  const { metrics, isLoading } = useOptimizationMetrics();

  return (
    (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CacheHitCard hits={metrics.cacheHits24h} loading={isLoading} rate={metrics.cacheHitRate} samples={metrics.totalSamples24h} />
      <RetriesSavedCard loading={isLoading} retries={metrics.retriesSaved24h} />
    </div>)
  );
}
