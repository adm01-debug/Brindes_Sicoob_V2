import { onCLS, onLCP, onTTFB, onFCP, onINP, type Metric } from 'web-vitals';
import { createClientLogger } from './structuredLogger';
import { captureException } from '@/lib/sentry';

const log = createClientLogger('performance.web-vitals');

/**
 * Reporta métricas de Core Web Vitals para o logger estruturado.
 * web-vitals v5 removeu onFID em favor de onINP (responsividade real).
 */
export function reportWebVitals() {
  const handleMetric = ({ name, value, delta, id, rating, entries }: Metric) => {
    const payload = {
      metric_id: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
      rating,
      navigation_type: entries[0]?.entryType === 'navigation' ? (entries[0] as any).type : 'unknown',
    };

    log.info(`metric_${name.toLowerCase()}`, payload);

    // Enviar para o Sentry se o rating for 'poor' ou se for uma métrica crítica lenta
    if (rating === 'poor' || (name === 'LCP' && value > 2500) || (name === 'INP' && value > 200)) {
      // Usamos um erro artificial para capturar o contexto da métrica no Sentry
      const perfError = new Error(`WebVital Poor: ${name} (${rating})`);
      captureException(perfError, {
        level: 'warning',
        tags: { metric: name, rating },
        extra: payload
      });
    }
  };

  onCLS(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);
}
