import { diagnostics } from '@/lib/diagnostics';

export type UxMetric =
  | 'nav.back'
  | 'nav.overlay-dismiss'
  | 'nav.forward'
  | 'nav.history-jump'
  | 'nav.scroll-restore'
  | 'guard.shown'
  | 'guard.confirm'
  | 'guard.cancel';

const counters = new Map<UxMetric, number>();

export function trackUx(metric: UxMetric, data?: Record<string, unknown>): void {
  counters.set(metric, (counters.get(metric) ?? 0) + 1);
  diagnostics.log('event', 'ux-nav', metric, data);
}

export function getUxMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}

export function resetUxMetrics(): void {
  counters.clear();
}

if (typeof window !== 'undefined') {
  (window as typeof window & { __UX_METRICS__?: typeof getUxMetrics }).__UX_METRICS__ = getUxMetrics;
}
