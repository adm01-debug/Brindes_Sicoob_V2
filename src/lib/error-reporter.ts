/**
 * Centralized error reporting service.
 * Captures unhandled errors and sends them to the database for monitoring.
 */
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';
import { onBridgeStatus, isColdStartSignal } from '@/lib/external-db/bridge-status-events';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const ERROR_QUEUE: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE = 20;

/**
 * Buffer de erros suspeitos de "cold-start" (503 / boot_error / function failed to start).
 * Adia o envio por COLD_START_DEFER_MS para que um evento `recovered` da bridge
 * possa descartá-los — evitando false positives quando a 2ª tentativa carrega com sucesso.
 */
type DeferredColdStart = {
  report: ErrorReport;
  timer: ReturnType<typeof setTimeout>;
};
const COLD_START_DEFER_MS = 8000;
const COLD_START_BUFFER: DeferredColdStart[] = [];
let bridgeListenerInstalled = false;
let globalErrorHandlersInstalled = false;

function installBridgeListenerOnce() {
  if (bridgeListenerInstalled) return;
  bridgeListenerInstalled = true;
  onBridgeStatus((e) => {
    if (e.type !== 'recovered') return;
    // Bridge recuperou: descarta todos os 503/boot ainda pendentes na janela.
    while (COLD_START_BUFFER.length > 0) {
      const pending = COLD_START_BUFFER.shift();
      if (!pending) continue;
      clearTimeout(pending.timer);
      logger.debug('[ErrorReporter] Discarded cold-start false positive after bridge recovery');
    }
  });
}

/**
 * Padrões de erros TRANSITÓRIOS de runtime das edge functions:
 *  - SUPABASE_EDGE_RUNTIME_ERROR
 *  - service is temporarily unavailable (503)
 *  - boot_error / function failed to start
 *  - 502 / 504 (bad gateway / gateway timeout — também são transientes)
 *
 * Esses erros NÃO devem ser registrados como "blank screen" / crash de UI,
 * pois quase sempre são curados pela 2ª tentativa do invoke (cold-start).
 */
const TRANSIENT_EDGE_RUNTIME_PATTERNS = [
  'supabase_edge_runtime_error',
  'service is temporarily unavailable',
  'boot_error',
  'function failed to start',
  'bad gateway',
  'gateway timeout',
];

const TRANSIENT_RE = new RegExp(TRANSIENT_EDGE_RUNTIME_PATTERNS.join('|'), 'i');

export function isTransientEdgeRuntimeError(input: string | Error | null | undefined): boolean {
  if (!input) return false;
  const haystack = typeof input === 'string'
    ? input
    : `${input.message} ${input.stack ?? ''}`;
  // isColdStartSignal cobre o vocabulário oficial da bridge; o regex local
  // amplia para variações que podem chegar do Error Boundary sem passar pela bridge.
  return isColdStartSignal(haystack) || TRANSIENT_RE.test(haystack);
}

async function flushErrors() {
  if (ERROR_QUEUE.length === 0) return;

  const batch = ERROR_QUEUE.splice(0, MAX_QUEUE);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    for (const err of batch) {
      err.userId = userId;
    }

    const rows = batch.map(err => ({
      user_id: err.userId || null,
      event_type: 'application_error',
      url: err.url,
      user_agent: err.userAgent.slice(0, 500),
      severity: (err.metadata?.severity as string) || (err.metadata?.category === 'blank_screen' ? 'critical' : 'error'),
      metadata: {
        ...err.metadata,
        error_message: err.message,
        error_stack: err.stack?.slice(0, 5000),
        component_stack: err.componentStack?.slice(0, 5000),
      } as Json,
    }));

    // Telemetria já existente no schema; Sentry continua recebendo o evento.
    const { error } = await supabase.from('telemetry_events').insert(rows);
    if (error) logger.warn('[ErrorReporter] Falha ao registrar telemetria:', error.message);

  } catch (e) {
    logger.warn('[ErrorReporter] Flush failed:', e);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushErrors();
  }, FLUSH_INTERVAL);
}

function enqueueReport(report: ErrorReport) {
  ERROR_QUEUE.push(report);
  if (ERROR_QUEUE.length >= MAX_QUEUE) {
    flushErrors();
  } else {
    scheduleFlush();
  }
}

function errorCategory(transient: boolean, originalType?: string): string {
  if (transient) return 'transient_edge_runtime';
  return originalType === 'react_error_boundary' ? 'blank_screen' : 'app_error';
}

function enrichedErrorMetadata(metadata: Record<string, unknown> | undefined, transient: boolean, originalType?: string): Record<string, unknown> {
  return {
    ...metadata,
    category: errorCategory(transient, originalType),
    platform: typeof window !== 'undefined' ? 'browser' : 'server',
    environment: import.meta.env?.MODE || 'production',
    ...(transient ? { type: 'transient_edge_runtime', original_type: originalType } : {}),
  };
}

function deferTransientError(error: Error, report: ErrorReport, metadata: Record<string, unknown>): void {
  installBridgeListenerOnce();
  const entry: DeferredColdStart = {
    report,
    timer: setTimeout(() => {
      const index = COLD_START_BUFFER.indexOf(entry);
      if (index >= 0) COLD_START_BUFFER.splice(index, 1);
      captureException(error, { ...metadata, cold_start_unrecovered: true });
      enqueueReport({ ...report, metadata: { ...(report.metadata ?? {}), cold_start_unrecovered: true } });
    }, COLD_START_DEFER_MS),
  };
  COLD_START_BUFFER.push(entry);
}

export function reportError(error: Error, metadata?: Record<string, unknown>) {
  const originalType = typeof metadata?.type === 'string' ? metadata.type : undefined;
  const transient = isTransientEdgeRuntimeError(error);

  const enrichedMetadata = enrichedErrorMetadata(metadata, transient, originalType);

  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    // URLs de recuperação/aprovação podem carregar tokens em query ou fragmento.
    url: window.location.origin + window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata: enrichedMetadata,
  };

  // Cold-start / runtime transitório (503, SUPABASE_EDGE_RUNTIME_ERROR, boot_error,
  // "service is temporarily unavailable", 502/504) costuma ser recuperado pela
  // 2ª tentativa. Adia o envio e descarta se a bridge emitir `recovered` dentro
  // da janela. Caller pode forçar registro imediato via metadata.skipColdStartDefer = true.
  const skipDefer = metadata?.skipColdStartDefer === true;
  if (!skipDefer && transient) {
    deferTransientError(error, report, enrichedMetadata);
    return;
  }

  // Forward to Sentry (no-op if DSN not configured)
  captureException(error, enrichedMetadata);
  enqueueReport(report);
}

/**
 * Install global error listeners for unhandled errors and promise rejections.
 */
export function installGlobalErrorHandlers() {
  if (globalErrorHandlersInstalled) return;
  globalErrorHandlersInstalled = true;
  installBridgeListenerOnce();
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    reportError(error, { type: 'unhandled_promise_rejection' });
  });
}
