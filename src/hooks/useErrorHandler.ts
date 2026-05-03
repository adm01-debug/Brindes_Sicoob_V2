import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  /** Custom message shown in toast. Falls back to error.message */
  message?: string;
  /** If true, suppress the toast notification */
  silent?: boolean;
  /** Optional callback after handling */
  onError?: (error: unknown) => void;
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
      const msg =
        options?.message ||
        (error instanceof Error ? error.message : 'Ocorreu um erro inesperado');

      console.error('[useErrorHandler]', error);

      // Log to query_telemetry if it's a DB error
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code: string; message: string };
        const isRls = pgError.code === '42501';
        
        supabase.from('query_telemetry').insert({
          operation: 'unhandled_error',
          error_message: pgError.message,
          error_code: pgError.code,
          is_rls_violation: isRls,
          severity: isRls ? 'critical' : 'error',
        }).then(({ error: logErr }) => {
          if (logErr) console.warn('Falha ao logar erro na telemetria', logErr);
        });
      }

      if (!options?.silent) {
        toast.error(msg);
      }

      options?.onError?.(error);
    },
    []
  );

  /**
   * Wraps an async function so any thrown error is automatically handled.
   */
  const wrapAsync = useCallback(
    <T extends (...args: never[]) => Promise<unknown>>(
      fn: T,
      options?: ErrorHandlerOptions
    ): ((...args: Parameters<T>) => Promise<ReturnType<T> | undefined>) => {
      return async (...args: Parameters<T>) => {
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
      toast.error('Erro inesperado. Tente recarregar a página.');
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[UnhandledRejection]', event.reason);
      toast.error('Erro inesperado. Tente recarregar a página.');
    };

    window.addEventListener('error', onUnhandled);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onUnhandled);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
}
