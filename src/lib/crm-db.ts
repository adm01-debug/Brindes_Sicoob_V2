/**
 * CRM Database Access Layer
 * 
 * Acessa o banco externo CRM (pgxfvjmuubtbowutlide) via Edge Function crm-db-bridge.
 * Substitui completamente o acesso a bitrix_clients.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { recordBridgeCall, estimatePayloadBytes } from "@/lib/telemetry/bridgeCallMetrics";
import { newRequestId, REQUEST_ID_HEADER } from "@/lib/telemetry/requestId";
import { getCircuitBreaker } from "@/lib/circuit-breaker";

const CRM_DB_BRIDGE_FUNCTION = "crm-db-bridge";
const crmBreaker = getCircuitBreaker(CRM_DB_BRIDGE_FUNCTION, {
  failureThreshold: 8,
  resetTimeout: 60000, // 60s
});


export interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean } | Array<string | { column: string; ascending?: boolean }>;
  limit?: number;
  offset?: number;
  search?: { column?: string; columns?: string[]; term: string };
  count?: "exact";
  head?: boolean;
  relations?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
}

export interface CrmResponse<T> {
  data: T;
  count?: number;
  unavailable?: boolean;
}

export class CrmUnavailableError extends Error {
  readonly code = "CRM_UNAVAILABLE";

  constructor() {
    super("CRM indisponível ou sem credenciais válidas");
    this.name = "CrmUnavailableError";
  }
}

export interface CrmSelectOptions {
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: CrmQuery["orderBy"];
  limit?: number;
  offset?: number;
  relations?: string;
  search?: CrmQuery["search"];
  count?: "exact";
  head?: boolean;
}

// ============================================
// BATCH SUPPORT — multiple SELECT queries in one call
// ============================================

export interface CrmBatchQuery {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
}

interface CrmBatchResult {
  success: boolean;
  data?: { records: unknown[]; count: number };
  error?: string;
  unavailable?: boolean;
  warning?: string;
}

interface CrmBridgePayload {
  success?: boolean;
  error?: string;
  results?: CrmBatchResult[];
  request_id?: unknown;
}

function bridgePayload(data: unknown): CrmBridgePayload {
  return data && typeof data === "object" ? data as CrmBridgePayload : {};
}

function serverRequestId(data: unknown): string | undefined {
  const id = bridgePayload(data).request_id;
  return id === undefined || id === null ? undefined : String(id);
}

function batchErrorMessage(data: unknown, invokeError?: { message?: string } | null): string | undefined {
  if (invokeError?.message) return invokeError.message;
  const payload = bridgePayload(data);
  return payload.success ? undefined : payload.error;
}

/**
 * Executa múltiplas queries SELECT no CRM em uma única invocação.
 */
export async function invokeCrmBatch(queries: CrmBatchQuery[]): Promise<CrmBatchResult[]> {
  const startedAt = performance.now();
  const body = { operation: "batch", queries };
  const reqBytes = estimatePayloadBytes(body);
  const requestId = newRequestId();
  const { data, error } = await crmBreaker.execute(() => 
    supabase.functions.invoke(CRM_DB_BRIDGE_FUNCTION, {
      body,
      headers: { [REQUEST_ID_HEADER]: requestId },
    })
  );


  const responseRequestId = serverRequestId(data);
  const payload = bridgePayload(data);

  recordBridgeCall({
    bridge: CRM_DB_BRIDGE_FUNCTION,
    op: "batch",
    target: queries.map(q => q.table).join(","),
    durationMs: performance.now() - startedAt,
    reqBytes,
    respBytes: error ? 0 : estimatePayloadBytes(data),
    ok: !error && Boolean(payload.success),
    errorMessage: batchErrorMessage(data, error),
    requestId,
    serverRequestId: responseRequestId,
  });

  if (error) {
    console.error(`[CRM-DB] Batch error [req_id=${requestId}]:`, error);
    throw new Error(`CRM batch error: ${error.message}`);
  }

  if (!payload.success) {
    throw new Error(payload.error || "CRM batch unknown error");
  }

  return payload.results || [];
}

// ============================================
// RETRY CONFIG
// ============================================

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 600;
const RETRYABLE_PATTERNS = [
  "statement timeout", "57014", "502", "503", "504",
  "bad gateway", "FunctionsHttpError", "non-2xx",
  "network", "fetch", "ECONNRESET", "socket hang up",
  "AbortError", "Failed to fetch", "boot",
];

function isRetryableCrmError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return RETRYABLE_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

async function extractCrmErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return "Erro ao acessar CRM";
  const context = (error as Error & { context?: Response }).context;
  if (!(context instanceof Response)) return error.message;
  return extractResponseError(context, error.message);
}

function parseResponseError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: string; details?: string };
    return [parsed.error, parsed.details].filter(Boolean).join(" | ") || fallback;
  } catch {
    return `${fallback} | ${raw}`;
  }
}

async function extractResponseError(response: Response, fallback: string): Promise<string> {
  try {
    const raw = await response.clone().text();
    return raw ? parseResponseError(raw, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function isReadOperation(query: CrmQuery): boolean {
  return query.operation === "select" || query.operation === "search";
}

function isUnconfiguredMessage(message: string): boolean {
  return /CRM connection is not configured correctly|Invalid URL|PLACEHOLDER_VALUE_TO_BE_REPLACED/i.test(message);
}

async function invokeCrmAttempt(query: CrmQuery, requestId: string) {
  return crmBreaker.execute(() => supabase.functions.invoke(CRM_DB_BRIDGE_FUNCTION, {
    body: query,
    headers: { [REQUEST_ID_HEADER]: requestId },
  }));
}

async function crmAttemptMessage(data: unknown, error: unknown): Promise<string> {
  if (error) return extractCrmErrorMessage(error);
  return bridgePayload(data).error || "Unknown CRM error";
}

function throwFinalCrmError(error: unknown, message: string, requestId: string): never {
  if (error) {
    console.error(`[CRM-DB] Edge function error [req_id=${requestId}]:`, message);
    throw new Error(`CRM DB error: ${message}`);
  }
  console.error(`[CRM-DB] Query error [req_id=${requestId}]:`, message);
  throw new Error(`CRM query error: ${message}`);
}

// ============================================
// SINGLE OPERATIONS
// ============================================

/**
 * Invoca o crm-db-bridge para acessar dados do CRM externo (com retry automático)
 */
export async function invokeCrmDb<T>(query: CrmQuery): Promise<CrmResponse<T>> {
  const startedAt = performance.now();
  const reqBytes = estimatePayloadBytes(query);
  const opLabel = query.operation || "invoke";
  const requestId = newRequestId();

  const record = (ok: boolean, data: unknown, errMsg?: string) => {
    recordBridgeCall({
      bridge: CRM_DB_BRIDGE_FUNCTION,
      op: opLabel,
      target: query.table,
      durationMs: performance.now() - startedAt,
      reqBytes,
      respBytes: ok ? estimatePayloadBytes(data) : 0,
      ok,
      errorMessage: errMsg,
      requestId,
      serverRequestId: serverRequestId(data),
    });
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await invokeCrmAttempt(query, requestId);
    const payload = bridgePayload(data);
    if (!error && !payload.error) {
      record(true, data);
      return data as CrmResponse<T>;
    }

    const msg = await crmAttemptMessage(data, error);

    // Soft-degrade: when the CRM bridge reports it isn't configured (placeholder
    // EXTERNAL_CRM_URL/keys), don't crash screens — return an empty result for
    // read operations so the UI keeps rendering. Writes still surface the error.
    if (isUnconfiguredMessage(msg) && isReadOperation(query)) {
      logger.warn(`[CRM-DB] CRM not configured — returning empty payload [req_id=${requestId}]`);
      record(false, null, msg);
      return { data: (query.id ? null : []) as unknown as T, unavailable: true };
    }

    if (attempt < MAX_RETRIES && isRetryableCrmError(msg)) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      logger.warn(`[CRM-DB] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms [req_id=${requestId}]: ${msg}`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    record(false, null, msg);

    throwFinalCrmError(error, msg, requestId);
  }

  record(false, null, "max retries exceeded");
  throw new Error("CRM DB: max retries exceeded");
}

/**
 * SELECT de tabela do CRM
 */
export async function selectCrm<T>(
  table: string,
  options?: CrmSelectOptions
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "select",
    ...options,
  });
  return result.data || [];
}

/** SELECT que preserva vazio legítimo, mas rejeita o soft-degrade do bridge. */
export async function selectCrmStrict<T>(
  table: string,
  options?: CrmSelectOptions,
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "select",
    ...options,
  });
  if (result.unavailable) throw new CrmUnavailableError();
  return result.data || [];
}

/** SELECT paginado que devolve a contagem exata do conjunto filtrado no CRM. */
export async function selectCrmPage<T>(
  table: string,
  options: CrmSelectOptions,
): Promise<{ data: T[]; count: number | null }> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "select",
    ...options,
    count: options.count ?? "exact",
  });
  return { data: result.data || [], count: typeof result.count === "number" ? result.count : null };
}

/**
 * SELECT single do CRM por ID
 */
export async function selectCrmById<T>(
  table: string,
  id: string,
  select?: string
): Promise<T | null> {
  try {
    const result = await invokeCrmDb<T>({
      table,
      operation: "select",
      id,
      select,
    });
    return result.data || null;
  } catch (err) {
    if (String(err).includes("404")) return null;
    throw err;
  }
}

/** SELECT por ID que rejeita indisponibilidade, mas preserva 404 como ausência legítima. */
export async function selectCrmByIdStrict<T>(
  table: string,
  id: string,
  select?: string,
): Promise<T | null> {
  try {
    const result = await invokeCrmDb<T>({ table, operation: "select", id, select });
    if (result.unavailable) throw new CrmUnavailableError();
    return result.data || null;
  } catch (error) {
    if (error instanceof CrmUnavailableError) throw error;
    if (String(error).includes("404")) return null;
    throw error;
  }
}

/**
 * Busca textual no CRM
 */
export async function searchCrm<T>(
  table: string,
  column: string,
  term: string,
  options?: {
    select?: string;
    orderBy?: string | { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "search",
    search: { column, term },
    ...options,
  });
  return result.data || [];
}

/**
 * INSERT no CRM
 */
export async function insertCrm<T>(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  returning?: string
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "insert",
    data,
    returning,
  });
  return result.data || [];
}

/**
 * UPDATE no CRM
 */
export async function updateCrm<T>(
  table: string,
  id: string,
  data: Record<string, unknown>,
  returning?: string
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "update",
    id,
    data,
    returning,
  });
  return result.data || [];
}

/**
 * UPDATE no CRM com filtros
 */
export async function updateCrmByFilter<T>(
  table: string,
  filters: Record<string, unknown>,
  data: Record<string, unknown>,
  returning?: string
): Promise<T[]> {
  const result = await invokeCrmDb<T[]>({
    table,
    operation: "update",
    filters,
    data,
    returning,
  });
  return result.data || [];
}

/**
 * DELETE no CRM
 */
export async function deleteCrm(
  table: string,
  id: string
): Promise<void> {
  await invokeCrmDb({
    table,
    operation: "delete",
    id,
  });
}

/**
 * DELETE no CRM com filtros
 */
export async function deleteCrmByFilter(
  table: string,
  filters: Record<string, unknown>
): Promise<void> {
  await invokeCrmDb({
    table,
    operation: "delete",
    filters,
  });
}
