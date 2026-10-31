/**
 * Utilitários de invocação do external-db-bridge com retry e error handling.
 * Extraído de useExternalDatabase.ts para modularização.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";
import { emitBridgeStatus, isColdStartSignal } from './bridge-status-events';
import { ensureCloudReady, CloudNotReadyError, getCachedCloudStatus } from '@/lib/cloud-status';
import { recordBridgeCall, estimatePayloadBytes, type BridgeOperation } from '@/lib/telemetry/bridgeCallMetrics';
import { newRequestId, REQUEST_ID_HEADER, newTraceparent, TRACEPARENT_HEADER } from '@/lib/telemetry/requestId';
import { getCircuitBreaker } from '@/lib/circuit-breaker';

const BRIDGE_NAME = 'external-db-bridge';

const bridgeBreaker = getCircuitBreaker(BRIDGE_NAME, {
  failureThreshold: 10,
  resetTimeout: 45000,
});

/**
 * Options accepted by the external-db CRUD helpers. The shape is intentionally
 * permissive (index signature) because the bridge forwards arbitrary PostgREST
 * parameters; only the operation/table fields are commonly read on the client.
 */
export interface InvokeOptions {
  table?: string;
  operation?: string;
  select?: string;
  filters?: Record<string, unknown>;
  data?: unknown;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean } | string;
  order?: string;
  ascending?: boolean;
  single?: boolean;
  count?: boolean | string | number | null;
  onConflict?: string;
  range?: [number, number];
  or?: string;
  [key: string]: unknown;
}

/**
 * Normalized result returned by the external-db CRUD helpers.
 */
export interface InvokeResult<T> {
  records?: T[];
  count?: number | null;
  [key: string]: unknown;
}
function deriveExternalOp(body: Record<string, unknown>): { op: BridgeOperation; target?: string } {
  const operation = typeof body.operation === 'string' ? body.operation : undefined;
  const table = typeof body.table === 'string' ? body.table : undefined;
  const rpc = typeof body.rpc === 'string' ? body.rpc : undefined;
  if (rpc) return { op: `rpc:${rpc}`, target: rpc };
  const supported = new Set<BridgeOperation>(['select', 'insert', 'update', 'delete', 'upsert', 'batch', 'rpc', 'ping']);
  if (operation && supported.has(operation as BridgeOperation)) return { op: operation as BridgeOperation, target: table };
  return { op: 'invoke', target: table };
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 800;
const RETRYABLE_PATTERNS = [
  'statement timeout', '57014', '502', '503', '504',
  'bad gateway', 'FunctionsHttpError',
  'network', 'fetch', 'ECONNRESET', 'socket hang up',
  'AbortError', 'Failed to fetch',
  // Cold-start / runtime boot do isolate da edge function (plataforma)
  'supabase_edge_runtime_error', 'service is temporarily unavailable',
  'boot_error', 'function failed to start',
];

// Erros determinísticos do Postgres/PostgREST: retry NUNCA muda o resultado.
// Falhar imediatamente economiza até 3×backoff (~5.6s) por chamada inválida.
const NON_RETRYABLE_PATTERNS = [
  'does not exist',          // column / relation X does not exist
  'invalid input syntax',    // type cast failures
  'pgrst',                   // PostgREST schema/parse errors
  'permission denied',       // RLS / role mismatch
  'duplicate key',           // 23505
  'violates ',               // foreign key / not-null / check constraints
  'syntax error',            // SQL syntax
  'malformed',
  'jwt',                     // auth-related (cliente precisa renovar, não retry)
  'unauthorized',
];

// Códigos HTTP determinísticos — exigem contexto explícito (returned/status/http)
// para evitar falsos positivos em IDs com hífens (ex: "abc-401-xyz", onde
// hífen conta como word boundary e \b401\b casaria por acidente).
const NON_RETRYABLE_HTTP_RE = /(?:returned\s+|status[: ]\s*|http[:/ ])(400|401|403)\b/i;

function matches(msg: string, patterns: string[]): boolean {
  const lower = msg.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

function isNonRetryableError(msg: string): boolean {
  if (/CATALOG_NOT_CONFIGURED|CATALOG_READ_ONLY/i.test(msg)) return true;
  // 503 é SEMPRE retentável (cold-start de isolate) — vence qualquer match acidental.
  if (/\b503\b/.test(msg) || /service is temporarily unavailable/i.test(msg)) return false;
  if (matches(msg, NON_RETRYABLE_PATTERNS)) return true;
  return NON_RETRYABLE_HTTP_RE.test(msg);
}

function isRetryableError(msg: string): boolean {
  // Determinísticos vencem a lista de retry mesmo que casem por acidente.
  if (isNonRetryableError(msg)) return false;
  return matches(msg, RETRYABLE_PATTERNS);
}

export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return 'Erro ao acessar banco externo';
  const context = (error as Error & { context?: Response }).context;
  if (!(context instanceof Response)) return error.message;
  return extractResponseMessage(context, error.message);
}

function parseFunctionError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: string; details?: string; hint?: string;
      message?: string; code?: string;
    };
    const detailed = [parsed.error, parsed.code, parsed.message, parsed.details, parsed.hint]
      .filter(Boolean).join(' | ');
    return detailed ? `${fallback} | ${detailed}` : fallback;
  } catch {
    return `${fallback} | ${raw}`;
  }
}

async function extractResponseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const raw = await response.clone().text();
    return raw ? parseFunctionError(raw, fallback) : fallback;
  } catch {
    return fallback;
  }
}

interface InvokeTelemetry {
  startedAt: number;
  reqBytes: number;
  op: BridgeOperation;
  target?: string;
  requestId: string;
  serverRequestId?: string;
}

type InvokeOutcome = { data: unknown; error: Error | null };

function responseRequestId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('request_id' in data)) return undefined;
  const value = (data as { request_id?: unknown }).request_id;
  return value === undefined || value === null ? undefined : String(value);
}

function finalizeInvoke(result: InvokeOutcome, telemetry: InvokeTelemetry): InvokeOutcome {
  const serverRequestId = responseRequestId(result.data) || telemetry.serverRequestId;
  recordBridgeCall({
    bridge: BRIDGE_NAME,
    op: telemetry.op,
    target: telemetry.target,
    durationMs: performance.now() - telemetry.startedAt,
    reqBytes: telemetry.reqBytes,
    respBytes: result.error ? 0 : estimatePayloadBytes(result.data),
    ok: !result.error,
    errorMessage: result.error?.message,
    requestId: telemetry.requestId,
    serverRequestId,
  });
  return result;
}

async function cloudGateOutcome(telemetry: InvokeTelemetry): Promise<InvokeOutcome | null> {
  const cached = getCachedCloudStatus();
  if (!cached || (cached.status !== 'down' && cached.status !== 'degraded')) return null;
  try {
    await ensureCloudReady(3000, true);
    return null;
  } catch (error) {
    if (!(error instanceof CloudNotReadyError)) throw error;
    logger.warn(`[external-db] Aborting invoke — cloud ${error.status}`);
    emitBridgeStatus({ type: 'unavailable', reason: error.message, attempts: 0 });
    return finalizeInvoke({ data: null, error }, telemetry);
  }
}

function compatibilityError(data: unknown): Error | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { _unconfigured?: unknown; fallback?: unknown; error?: unknown; message?: unknown };
  if (!payload._unconfigured && !payload.fallback && !payload.error) return null;
  const message = payload._unconfigured
    ? 'CATALOG_NOT_CONFIGURED: catálogo indisponível'
    : String(payload.message || payload.error || 'Catálogo indisponível');
  return new Error(message);
}

async function waitBeforeRetry(
  message: string,
  attempt: number,
  retries: number,
  onRetry?: (attempt: number, maxRetries: number, delayMs: number) => void,
): Promise<boolean> {
  const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  const delay = Math.min(base + jitter, 4000);
  logger.warn(`[external-db] Retry ${attempt + 1}/${retries} after ${delay}ms (base=${base}+jitter=${jitter}): ${message}`);
  onRetry?.(attempt + 1, retries, delay);
  const coldStart = isColdStartSignal(message);
  if (coldStart) {
    emitBridgeStatus({
      type: 'degraded', attempt: attempt + 1, maxAttempts: retries,
      delayMs: delay, baseDelayMs: base, jitterMs: jitter, reason: message,
    });
  }
  await new Promise(resolve => setTimeout(resolve, delay));
  return coldStart;
}

function finalizeSuccessfulInvoke(data: unknown, sawColdStart: boolean, telemetry: InvokeTelemetry): InvokeOutcome {
  const legacyError = compatibilityError(data);
  if (legacyError) return finalizeInvoke({ data: null, error: legacyError }, telemetry);
  if (sawColdStart) emitBridgeStatus({ type: 'recovered' });
  return finalizeInvoke({ data, error: null }, telemetry);
}

function finalizeFailedInvoke(args: {
  data: unknown;
  error: Error;
  message: string;
  attempt: number;
  telemetry: InvokeTelemetry;
}): InvokeOutcome {
  if (isColdStartSignal(args.message)) {
    emitBridgeStatus({ type: 'unavailable', reason: args.message, attempts: args.attempt + 1 });
  }
  return finalizeInvoke({ data: args.data, error: args.error }, args.telemetry);
}

export async function invokeWithRetry(
  body: Record<string, unknown>,
  retries = MAX_RETRIES,
  onRetry?: (attempt: number, maxRetries: number, delayMs: number) => void
): Promise<{ data: unknown; error: Error | null }> {
  let sawColdStart = false;
  const startedAt = performance.now();
  const reqBytes = estimatePayloadBytes(body);
  const { op, target } = deriveExternalOp(body);
  const requestId = newRequestId();
  const traceparent = newTraceparent();
  const telemetry: InvokeTelemetry = { startedAt, reqBytes, op, target, requestId };

  // Gate best-effort: só bloqueia se uma sondagem recente confirmou estado ruim.
  // Não força sondagem nova aqui (evita latência extra e dependência em testes mockados);
  // o polling do useCloudStatus mantém o cache atualizado.
  const gateOutcome = await cloudGateOutcome(telemetry);
  if (gateOutcome) return gateOutcome;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await bridgeBreaker.execute(() => 
      supabase.functions.invoke(BRIDGE_NAME, {
        body,
        headers: { 
          [REQUEST_ID_HEADER]: requestId,
          [TRACEPARENT_HEADER]: traceparent 
        },
      })
    );

    if (!error) return finalizeSuccessfulInvoke(data, sawColdStart, telemetry);

    const msg = await extractFunctionErrorMessage(error);

    // Fail-fast em erros determinísticos (schema/validação/auth) — retry não muda o resultado.
    if (isNonRetryableError(msg)) {
      logger.warn(`[external-db] Fail-fast (deterministic error, no retry): ${msg}`);
      return finalizeInvoke({ data, error }, telemetry);
    }

    if (attempt < retries && isRetryableError(msg)) {
      sawColdStart = await waitBeforeRetry(msg, attempt, retries, onRetry) || sawColdStart;
      continue;
    }

    return finalizeFailedInvoke({ data, error, message: msg, attempt, telemetry });
  }
  return finalizeInvoke({ data: null, error: new Error('Max retries exceeded') }, telemetry);
}
