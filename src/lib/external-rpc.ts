/**
 * Módulo compartilhado para invocar RPCs no banco externo Promobrind.
 * 
 * IMPORTANTE: Este é o ÚNICO local onde invokeExternalRpc deve ser definido.
 * Todos os hooks e utils devem importar daqui.
 * 
 * Usa a edge function 'external-db-bridge' como proxy autenticado.
 * Inclui retry automático com backoff exponencial para erros transientes.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";
import { CircuitBreaker } from "@/lib/security/circuit-breaker";

const externalRpcBreaker = new CircuitBreaker('ExternalRPC', {
  failureThreshold: 10,
  cooldownPeriodMs: 60000,
});

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 800;
const RETRYABLE_PATTERNS = [
  'statement timeout', '57014', '502', '503', '504', 'FunctionsHttpError',
  'network', 'fetch', 'ECONNRESET', 'socket hang up',
  'AbortError', 'Failed to fetch',
  // Cold-start / runtime boot do isolate (plataforma)
  'supabase_edge_runtime_error', 'service is temporarily unavailable',
  'boot_error', 'function failed to start', 'bad gateway',
];

function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return RETRYABLE_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

interface RpcAttempt<T> {
  value?: T;
  message?: string;
}

async function runRpcAttempt<T>(
  rpcName: string,
  params: Record<string, unknown>,
): Promise<RpcAttempt<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { operation: 'rpc', rpcName, rpcParams: params },
  });
  if (!error && data?.success) return { value: data.data as T };
  return { message: error?.message || data?.error || 'Erro na RPC' };
}

async function waitBeforeRetry(attempt: number, rpcName: string, message: string): Promise<void> {
  const waitMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  logger.warn(`[external-rpc] Retry ${attempt + 1}/${MAX_RETRIES} for ${rpcName} after ${waitMs}ms: ${message}`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

/**
 * Invoca uma RPC no banco externo via edge function.
 * Retry automático (3x, backoff exponencial) para erros de timeout/rede.
 */
export async function invokeExternalRpc<T>(
  rpcName: string,
  params: Record<string, unknown>
): Promise<T> {
  return externalRpcBreaker.execute(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const result = await runRpcAttempt<T>(rpcName, params);
      if (result.value !== undefined) return result.value;

      const message = result.message || 'Erro na RPC';
      const shouldRetry = attempt < MAX_RETRIES && isRetryableError(message);
      if (!shouldRetry) throw new Error(message);
      await waitBeforeRetry(attempt, rpcName, message);
    }

    throw new Error('Max retries exceeded');
  });
}
