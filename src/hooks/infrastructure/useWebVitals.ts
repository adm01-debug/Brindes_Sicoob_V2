import { useCallback, useEffect } from 'react';
import { onLCP, onFID, onCLS, onINP, onTTFB, type Metric } from 'web-vitals';

interface WebVitalsConfig {
  sampleRate?: number;
  onReport?: (metric: Metric) => void;
  debug?: boolean;
}

/**
 * useWebVitals — Hook para monitoramento de Core Web Vitals em tempo real.
 * 
 * Este hook captura métricas de performance do navegador e permite:
 * 1. Logs em desenvolvimento para depuração rápida (LCP, CLS, INP).
 * 2. Envio para o painel de produção (Supabase Telemetry).
 * 3. Filtragem por tipo de dispositivo e versão do app.
 */
export function useWebVitals({ sampleRate = 1.0, onReport, debug = false }: WebVitalsConfig = {}) {
  const reportMetric = useCallback((metric: Metric) => {
    // Amostragem aleatória para evitar sobrecarga de rede em produção
    if (Math.random() > sampleRate) return;

    if (debug) {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
    }

    if (onReport) {
      onReport(metric);
    }

    // Enviar para Supabase (ou sua API de telemetria)
    // Aqui injetamos metadados úteis para o painel
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      delta: metric.delta,
      id: metric.id,
      navigationType: (metric as any).navigationType,
      url: window.location.pathname,
      device: getDeviceType(),
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      timestamp: new Date().toISOString(),
      version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    };

    // Exemplo de chamada silenciosa para telemetria
    // Em Lovable Cloud, usaríamos uma Edge Function ou tabela de logs
    if (!debug && window.location.hostname !== 'localhost') {
      fetch('/api/telemetry/web-vitals', {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {}); // Falha silenciosa para não afetar UX
    }
  }, [sampleRate, onReport, debug]);

  useEffect(() => {
    onLCP(reportMetric);
    onFID(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
    onTTFB(reportMetric);
  }, [reportMetric]);
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return 'mobile';
  return 'desktop';
}
