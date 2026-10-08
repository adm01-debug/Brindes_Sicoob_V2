import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reportError } from '@/lib/error-reporter';

interface ErrorHandlerOptions {
  /** Custom message shown in toast. Falls back to error.message */
  message?: string;
  /** If true, suppress the toast notification */
  silent?: boolean;
  /** Optional callback after handling */
  onError?: (error: unknown) => void;
}

function errorMessage(error: unknown, options?: ErrorHandlerOptions): string {
  if (options?.message) return options.message;
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
}

function isCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('cancel');
}

function errorMetadata(error: unknown, options?: ErrorHandlerOptions): Record<string, unknown> {
  const customMessage = options?.message ? { customMessage: options.message } : {};
  const pgCode = error && typeof error === 'object' && 'code' in error ? { pg_code: error.code } : {};
  return { context: 'useErrorHandler', severity: options?.silent ? 'info' : 'error', ...customMessage, ...pgCode };
}

function reportHandledError(error: unknown, message: string, metadata: Record<string, unknown>): void {
  reportError(error instanceof Error ? error : new Error(message), error instanceof Error ? metadata : { ...metadata, originalError: error });
}

function logDatabaseError(error: unknown): void {
  if (!error || typeof error !== 'object' || !('code' in error)) return;
  const pgError = error as { code: string; message: string };
  const isRls = pgError.code === '42501';
  supabase.from('telemetry_events').insert({
    event_type: 'database_error',
    severity: isRls ? 'critical' : 'error',
    metadata: { operation: 'unhandled_error', error_message: pgError.message, error_code: pgError.code, is_rls_violation: isRls },
  }).then(({ error: logError }) => {
    if (logError) console.warn('Falha ao logar erro na telemetria', logError);
  });
}

function handleErrorValue(error: unknown, options?: ErrorHandlerOptions): void {
  if (isCancellation(error)) return;
  const message = errorMessage(error, options);
  console.error('[useErrorHandler]', error);
  reportHandledError(error, message, errorMetadata(error, options));
  logDatabaseError(error);
  if (!options?.silent) toast.error(message);
  options?.onError?.(error);
}

/**
 * useErrorHandler — Centralised async error handling with toast notifications.
 *
 * Usage:
 *   const { handleError, wrapAsync } = useErrorHandler();
 *
 *   // Option A: wrap an async fn
 *   const safeSave = wrapAsync(async () => { ... });
 *
 *   // Option B: catch manually
 *   try { ... } catch (e) { handleError(e, { message: 'Falha ao salvar' }); }
 */
export function useErrorHandler() {
  const handleError = useCallback(
    (error: unknown, options?: ErrorHandlerOptions) => {
      handleErrorValue(error, options);
    },
    []
  );

  /**
   * Wraps an async function so any thrown error is automatically handled.
   */
  const wrapAsync = useCallback(
    <TArgs extends unknown[], TResult>(
      fn: (...args: TArgs) => Promise<TResult>,
      options?: ErrorHandlerOptions
    ): ((...args: TArgs) => Promise<TResult | undefined>) => {
      return async (...args: TArgs) => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, options);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return { handleError, wrapAsync };
}

/**
 * useGlobalErrorCatcher — Captures unhandled errors & promise rejections globally.
 * Mount once at the app root (e.g. inside App or a top-level provider).
 */
export function useGlobalErrorCatcher() {
  useEffect(() => {
    const onUnhandled = (event: ErrorEvent) => {
      console.error('[GlobalError]', event.error);
      
      // Dispatch custom event for critical error UI
      window.dispatchEvent(new CustomEvent('app-critical-error', { 
        detail: { 
          message: event.message || 'Erro inesperado na aplicação.',
          error: event.error,
          type: 'runtime'
        } 
      }));

      // Fallback for global reporter if not already caught
      if (event.error instanceof Error) {
        reportError(event.error, { type: 'unhandled_error_global' });
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[UnhandledRejection]', event.reason);
      
      const isCritical = event.reason?.status === 500 || event.reason?.message?.includes('500');

      window.dispatchEvent(new CustomEvent('app-critical-error', { 
        detail: { 
          message: 'Falha crítica na comunicação com o servidor.',
          error: event.reason,
          type: isCritical ? 'server' : 'rejection'
        } 
      }));

      if (event.reason instanceof Error) {
        reportError(event.reason, { type: 'unhandled_rejection_global' });
      }
    };

    window.addEventListener('error', onUnhandled);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onUnhandled);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
}
