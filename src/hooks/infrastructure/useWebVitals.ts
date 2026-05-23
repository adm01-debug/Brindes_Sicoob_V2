import { useCallback, useEffect } from 'react';
import { onLCP, onCLS, onINP, onTTFB, type Metric } from 'web-vitals';
import { supabase } from "@/integrations/supabase/client";

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
  const reportMetric = useCallback(async (metric: Metric) => {
    // Amostragem aleatória para evitar sobrecarga de rede em produção
    if (Math.random() > sampleRate) return;

    if (debug) {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
    }

    if (onReport) {
      onReport(metric);
    }

    // Enviar para Supabase
    const metadata = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: (metric as any).navigationType,
      device: getDeviceType(),
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      version: "2.0.0", // Idealmente dinâmico do package.json ou env
    };

    if (window.location.hostname !== 'localhost') {
      try {
        await supabase.from('telemetry_events').insert({
          event_type: 'web_vitals',
          severity: metric.rating === 'poor' ? 'error' : metric.rating === 'needs-improvement' ? 'warning' : 'info',
          url: window.location.pathname,
          metadata,
          user_agent: navigator.userAgent
        });
      } catch (err) {
        if (debug) console.error('Failed to send web vitals:', err);
      }
    }
  }, [sampleRate, onReport, debug]);

  useEffect(() => {
    onLCP(reportMetric);
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

