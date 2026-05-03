import { onCLS, onLCP, onTTFB, onFCP, onINP } from 'web-vitals';
import { createClientLogger } from './structuredLogger';

const log = createClientLogger('performance.web-vitals');

/**
 * Reporta métricas de Core Web Vitals para o logger estruturado.
 * web-vitals v5 removeu onFID em favor de onINP (responsividade real).
 */
export function reportWebVitals() {
  const handleMetric = ({ name, value, delta, id, rating, entries }: any) => {
    log.info(`metric_${name.toLowerCase()}`, {
      metric_id: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
      rating,
      navigation_type: entries[0]?.entryType === 'navigation' ? (entries[0] as any).type : 'unknown',
    });
  };

  onCLS(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);
}
import { createClientLogger } from './structuredLogger';

const log = createClientLogger('performance.web-vitals');

/**
 * Reporta métricas de Core Web Vitals para o logger estruturado.
 * Em produção, isso alimentará o Supabase Analytics/Logflare.
 */
export function reportWebVitals() {
  const handleMetric = ({ name, value, delta, id, rating, entries }: any) => {
    log.info(`metric_${name.toLowerCase()}`, {
      metric_id: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value), // CLS scale is different
      delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
      rating,
      navigation_type: entries[0]?.entryType === 'navigation' ? (entries[0] as any).type : 'unknown',
    });
  };

  onCLS(handleMetric);
  onFID(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);
}
