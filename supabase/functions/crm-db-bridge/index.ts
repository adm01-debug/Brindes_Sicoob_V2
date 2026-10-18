import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { runBotProtection } from '../_shared/bot-protection.ts';
import { getBreaker, circuitOpenResponse, getAllBreakerStatuses } from '../_shared/circuit-breaker.ts';
import { AsyncLocalStorage } from "node:async_hooks";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { resolveCredential, buildCredentialsHealth } from "../_shared/credentials.ts";
import { buildCompanySearchOr } from "./search-query.ts";
import {
  canAccessCrmRequest,
  hasActivePortalMembership,
} from "../_shared/portal-access-policy.ts";

const breaker = getBreaker("crm-db");

// Contexto async por-request — garante isolamento mesmo com requisições concorrentes.
// Cada handler.run() instala um requestId na chain; jsonResponse lê dele.
const requestCtx = new AsyncLocalStorage<{ requestId: string }>();
function currentRequestId(): string | undefined {
  return requestCtx.getStore()?.requestId;
}

// ============================================
// CRM CLIENT — singleton por isolate + warm-up no boot
// ============================================
// Mesma estratégia da external-db-bridge (1 client por isolate, fetch keep-alive
// mantém socket TLS aberto). Antes desta otimização cada request criava um novo
// client (linha ~627), pagando handshake TLS + auth a cada chamada paralela.
// Profile do dashboard mostrava 2.66s de cold-start no primeiro hit ao CRM.
let cachedCrmClient: SupabaseClient | null = null;
let crmWarmupPromise: Promise<void> | null = null;
let crmWarmupCompleted = false;

// ─── Métricas de cold vs warm path (vida do isolate) ──────────────────
// Todas em ms; null quando ainda não medido. Reiniciam a cada cold start
// porque o isolate inteiro é descartado pelo runtime entre invocações ociosas.
const isolateBootedAt = Date.now();              // wall-clock do boot
const isolateMonoStart = performance.now();      // monotônico, base para deltas
let clientBuildMs: number | null = null;         // tempo p/ instanciar o SupabaseClient
let warmupStartedAtMs: number | null = null;     // delta desde boot quando warmup começou
let warmupMs: number | null = null;              // duração do warmup query
let warmupOk = false;
let warmupError: string | null = null;
let firstRequestMs: number | null = null;        // duração da 1ª request real (pós-boot)
let firstRequestStartedAtMs: number | null = null; // delta desde boot quando 1ª request entrou
let requestCount = 0;                            // total de requests recebidas pelo isolate
let coldRequestCount = 0;                        // requests marcadas como was_cold

function buildCrmClient(url: string, key: string): SupabaseClient {
  const t0 = performance.now();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Só registra a primeira construção (singleton) — chamadas subsequentes não acontecem.
  if (clientBuildMs === null) {
    clientBuildMs = Math.round(performance.now() - t0);
    console.log(`[crm-boot] client_build_ms=${clientBuildMs}`);
  }
  return client;
}

export async function getCrmClient(): Promise<SupabaseClient | null> {
  if (cachedCrmClient) return cachedCrmClient;
  // SSOT: DB-first via integration_credentials, fallback to legacy env aliases
  // (CRM_SUPABASE_URL / CRM_SUPABASE_SERVICE_KEY / CRM_SUPABASE_ANON_KEY).
  const [{ value: url }, { value: serviceKey }, { value: anonKey }] = await Promise.all([
    resolveCredential("EXTERNAL_CRM_URL"),
    resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
    resolveCredential("EXTERNAL_CRM_ANON_KEY"),
  ]);
  const key = serviceKey ?? anonKey;
  if (!url || !key) return null;
  cachedCrmClient = buildCrmClient(url, key);
  return cachedCrmClient;
}

/**
 * Test-only: snapshot do estado de boot do client. Usado para asserções em
 * testes de concorrência (garantir que o singleton é construído uma única vez).
 */
export function __getClientBootStateForTests() {
  return {
    cached: cachedCrmClient,
    clientBuildMs,
  };
}

/**
 * Warm-up no boot do isolate — abre TLS + handshake PostgREST em paralelo
 * ao Deno.serve. Não bloqueia o handler; idempotente.
 *
 * Faz `select id from companies limit 1` (tabela quente conhecida) — mesmo
 * shape que o `prewarmExternalDb` chama no front, então o cache HTTP do
 * PostgREST schema já fica preparado para a primeira request real.
 */
function warmupCrmClient(): Promise<void> {
  if (crmWarmupPromise) return crmWarmupPromise;
  warmupStartedAtMs = Math.round(performance.now() - isolateMonoStart);
  crmWarmupPromise = (async () => {
    const t0 = performance.now();
    try {
      const client = await getCrmClient();
      if (!client) {
        warmupError = "crm_not_configured";
        console.warn("[crm-boot-warmup] ⚠️ CRM_SUPABASE_URL/KEY não configuradas");
        warmupMs = Math.round(performance.now() - t0);
        return;
      }
      const { error } = await client.from('companies').select('id').limit(1);
      warmupMs = Math.round(performance.now() - t0);
      if (error) {
        warmupError = "warmup_query_failed";
        console.warn(`[crm-boot-warmup] ⚠️ warmup_ms=${warmupMs} error="${error.message}"`);
      } else {
        warmupOk = true;
        crmWarmupCompleted = true;
        console.log(
          `[crm-boot-warmup] ✅ ready client_build_ms=${clientBuildMs} ` +
            `warmup_started_at_ms=${warmupStartedAtMs} warmup_ms=${warmupMs}`,
        );
      }
    } catch (e) {
      warmupMs = Math.round(performance.now() - t0);
      const detail = e instanceof Error ? e.message : String(e);
      warmupError = "warmup_failed";
      console.warn(`[crm-boot-warmup] ⚠️ warmup_ms=${warmupMs} ${detail}`);
    }
  })();
  return crmWarmupPromise;
}

// Dispara warm-up no boot do isolate (não-bloqueante).
warmupCrmClient();


// ============================================
// CORS
// ============================================

// CORS headers are now dynamic — initialized per-request in Deno.serve
// See _shared/cors.ts for the centralized configuration
let corsHeaders: Record<string, string> = {};

function jsonResponse(body: unknown, status = 200): Response {
  const reqId = currentRequestId();
  // Injeta request_id no body (objeto) e no header — permite ao client
  // correlacionar com os logs do servidor sem mudar o shape esperado.
  let finalBody: unknown = body;
  if (reqId && body && typeof body === "object" && !Array.isArray(body)) {
    finalBody = { ...(body as Record<string, unknown>), request_id: reqId };
  }
  const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (reqId) headers[REQUEST_ID_HEADER] = reqId;
  return new Response(JSON.stringify(finalBody), { status, headers });
}

type DiagOp = "ping" | "diag" | "breaker_status" | "creds_health";

/**
 * Detecta operações de diagnóstico (`ping` | `diag` | `breaker_status` |
 * `creds_health`) sem consumir o body original. Aceita querystring
 * (`?op=…`, `?ping=1`, `?diag=1`, `?breaker=1`, `?creds=1`) ou body JSON
 * `{ "operation": "…" }`.
 */
async function detectDiagOp(req: Request): Promise<DiagOp | null> {
  // Query string
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op");
    if (op === "ping" || op === "diag" || op === "breaker_status" || op === "creds_health") return op;
    if (url.searchParams.get("ping") === "1") return "ping";
    if (url.searchParams.get("diag") === "1") return "diag";
    if (url.searchParams.get("breaker") === "1") return "breaker_status";
    if (url.searchParams.get("creds") === "1") return "creds_health";
  } catch { /* ignore */ }

  // Body JSON (POST/PUT/PATCH apenas; clonamos para não consumir o original)
  if (req.method !== "GET" && req.method !== "HEAD") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const cloned = req.clone();
        const peek = await cloned.json() as { operation?: unknown };
        if (peek?.operation === "ping" || peek?.operation === "diag" || peek?.operation === "breaker_status" || peek?.operation === "creds_health") {
          return peek.operation as DiagOp;
        }
      } catch { /* corpo inválido — não é diag */ }
    }
  }
  return null;
}

/**
 * Snapshot do estado de resolução das credenciais CRM, sem expor valores.
 * Bypass auth (igual a ping/diag/breaker_status) — operadores precisam
 * conseguir checar saúde mesmo se JWT/secrets estiverem quebrados.
 *
 * Lógica de agregação está em `_shared/credentials.ts:buildCredentialsHealth`
 * para reuso por outras edge functions (quote-sync, expert-chat, etc).
 */
async function buildCredsHealthSnapshot() {
  return await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ]);
}

/**
 * Snapshot completo de métricas de boot/runtime do isolate atual.
 * Cada isolate tem sua própria vida — quando o runtime descarta o isolate
 * por ociosidade, o próximo cold start gera novos valores.
 */
function buildDiagSnapshot() {
  const now = Date.now();
  return {
    ok: true,
    ts: now,
    warm: crmWarmupCompleted,
    isolate: {
      booted_at: isolateBootedAt,
      age_ms: now - isolateBootedAt,
      request_count: requestCount,
      cold_request_count: coldRequestCount,
    },
    boot: {
      client_build_ms: clientBuildMs,
      warmup_started_at_ms: warmupStartedAtMs,
      warmup_ms: warmupMs,
      warmup_ok: warmupOk,
      warmup_error: warmupError,
    },
    runtime: {
      first_request_started_at_ms: firstRequestStartedAtMs,
      first_request_ms: firstRequestMs,
    },
  };
}


// ============================================
// CONSTANTS
// ============================================

const ALLOWED_TABLES = [
  "companies", "contacts", "company_addresses", "company_social_media",
  "contact_emails", "contact_phones", "customers", "suppliers", "carriers",
];

const OPTIONAL_QUOTE_TABLES = new Set<string>();

// ============================================
// TYPE-SAFE RESULT HELPERS
// ============================================

/**
 * Narrow an unknown value (which may also be a PostgREST GenericStringError
 * or any other non-row payload) to a plain Record<string, unknown>.
 * Returns null when the value is not a usable row object.
 */
export function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  // PostgREST GenericStringError has shape { error: true; message: string }
  // and should never be treated as a row.
  const maybeErr = value as { error?: unknown; message?: unknown };
  if (maybeErr.error === true && typeof maybeErr.message === "string") return null;
  return value as Record<string, unknown>;
}

/**
 * Safely access the first row of a PostgREST result (`data` from `.select()`),
 * which Supabase types as `T[] | null` but at runtime can also surface
 * `GenericStringError`-like payloads when selectors fail. Returns null
 * unless the first element is a real row object.
 */
export function firstRowAsRecord(result: unknown): Record<string, unknown> | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  return toRecord(result[0]);
}

/**
 * Classify the shape of a PostgREST `data` payload returned by an
 * insert/update so we can log clearly when it is NOT a real row array.
 *
 * Possible shapes:
 *  - "rows"        → expected: Array<Record>
 *  - "empty-array" → [] returned (no rows affected, no error)
 *  - "null"        → null returned
 *  - "generic-string-error" → { error: true, message: "..." } (PostgREST shape)
 *  - "single-object"        → object returned instead of array (.single()/.maybeSingle())
 *  - "primitive"            → string/number/boolean
 *  - "unknown"              → anything else
 */
export type InsertResultShape =
  | "rows"
  | "empty-array"
  | "null"
  | "generic-string-error"
  | "single-object"
  | "primitive"
  | "unknown";

export interface InsertResultDiagnostic {
  shape: InsertResultShape;
  rowCount: number;
  /** Stringified preview of the payload (truncated) for log readability. */
  preview: string;
  /** Extracted message when shape is "generic-string-error". */
  errorMessage?: string;
}

const PREVIEW_MAX = 400;

function previewValue(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return String(value);
    return json.length > PREVIEW_MAX ? `${json.slice(0, PREVIEW_MAX)}…` : json;
  } catch {
    return String(value);
  }
}

export function inspectInsertResult(value: unknown): InsertResultDiagnostic {
  if (value === null) return { shape: "null", rowCount: 0, preview: "null" };
  if (value === undefined) return { shape: "null", rowCount: 0, preview: "undefined" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { shape: "empty-array", rowCount: 0, preview: "[]" };
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const maybeErr = first as { error?: unknown; message?: unknown };
      if (maybeErr.error === true && typeof maybeErr.message === "string") {
        return {
          shape: "generic-string-error",
          rowCount: value.length,
          preview: previewValue(value),
          errorMessage: maybeErr.message,
        };
      }
      return { shape: "rows", rowCount: value.length, preview: previewValue(value) };
    }
    return { shape: "unknown", rowCount: value.length, preview: previewValue(value) };
  }

  if (typeof value === "object") {
    const maybeErr = value as { error?: unknown; message?: unknown };
    if (maybeErr.error === true && typeof maybeErr.message === "string") {
      return {
        shape: "generic-string-error",
        rowCount: 0,
        preview: previewValue(value),
        errorMessage: maybeErr.message,
      };
    }
    return { shape: "single-object", rowCount: 1, preview: previewValue(value) };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { shape: "primitive", rowCount: 0, preview: previewValue(value) };
  }
  return { shape: "unknown", rowCount: 0, preview: previewValue(value) };
}

/**
 * Emit a structured log line whenever an insert/update result is not a
 * regular array of rows. This makes runtime debugging of GenericStringError
 * (and other unexpected shapes) trivial — search logs for `result-shape-anomaly`.
 *
 * Returns true if an anomaly was logged.
 */
export function logInsertResultIfAnomalous(
  context: { callSite: string; table: string; operation: "insert" | "update"; returning?: string },
  diagnostic: InsertResultDiagnostic,
): boolean {
  if (diagnostic.shape === "rows") return false;

  const payload = {
    event: "result-shape-anomaly",
    callSite: context.callSite,
    operation: context.operation,
    table: context.table,
    returning: context.returning ?? "*",
    shape: diagnostic.shape,
    rowCount: diagnostic.rowCount,
    errorKind: diagnostic.errorMessage ? "database_error" : undefined,
    preview: "[redacted]",
  };

  const icon = diagnostic.shape === "generic-string-error" ? "🚨" : "⚠️";
  console.error(
    `[crm-db-bridge] ${icon} result-shape-anomaly op=${context.operation} table=${context.table} ` +
      `shape=${diagnostic.shape}` +
      ` → ${JSON.stringify(payload)}`,
  );
  return true;
}


interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete" | "batch" | "quote_directory";
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
  queries?: BatchQuery[];
  action?: "companies" | "contacts";
  companyId?: string;
  term?: string;
}

interface BatchQuery {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column?: string; columns?: string[]; term: string };
}

interface AuthResult {
  userId: string | null;
  userRoles: string[];
  error?: Response;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

const CrmRequestSchema = z.object({
  operation: z.enum(["select", "search", "insert", "update", "delete", "batch", "quote_directory"]),
  table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(),
  id: z.string().uuid().optional(),
  filters: z.record(z.unknown()).optional(),
  select: z.string().max(2000).optional(),
  orderBy: z.union([
    z.string(),
    z.object({ column: z.string(), ascending: z.boolean().optional() }),
    z.array(z.union([z.string(), z.object({ column: z.string(), ascending: z.boolean().optional() })])).min(1).max(3),
  ]).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.object({
    column: z.string().optional(),
    columns: z.array(z.enum(["title", "nome_fantasia", "razao_social", "cnpj", "cidade"])).max(5).optional(),
    term: z.string().max(200),
  }).refine((search) => Boolean(search.column || search.columns?.length)).optional(),
  count: z.enum(["exact"]).optional(),
  head: z.boolean().optional(),
  relations: z.string().max(2000).optional(),
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
  returning: z.string().max(2000).optional(),
  queries: z.array(z.record(z.unknown())).max(10).optional(),
  action: z.enum(["companies", "contacts"]).optional(),
  companyId: z.string().uuid().optional(),
  term: z.string().trim().min(2).max(100).optional(),
});

// ============================================
// AUTH
// ============================================

async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, userRoles: [], error: jsonResponse({ error: "Autenticação necessária" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("[crm-auth] Configuração local de autenticação incompleta");
    return { userId: null, userRoles: [], error: jsonResponse({ error: "Serviço de autenticação indisponível" }, 503) };
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (!user || userError) {
    console.error("CRM auth failed:", userError?.message);
    return { userId: null, userRoles: [], error: jsonResponse({ error: "Token inválido ou expirado" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const [rolesResult, profileResult] = await Promise.all([
    adminClient.from("user_roles").select("role").eq("user_id", user.id),
    adminClient.from("profiles").select("is_active, deleted_at").eq("user_id", user.id).maybeSingle(),
  ]);

  if (rolesResult.error || profileResult.error) {
    console.error("[crm-auth] Falha ao validar vínculo/papéis:", rolesResult.error?.message ?? profileResult.error?.message);
    return { userId: null, userRoles: [], error: jsonResponse({ error: "Não foi possível validar o acesso" }, 503) };
  }

  const userRoles = [...new Set((rolesResult.data ?? [])
    .map((row: { role?: unknown }) => row.role)
    .filter((role): role is string => typeof role === "string" && role.length > 0))];

  if (!hasActivePortalMembership(profileResult.data, userRoles)) {
    console.warn(`[crm-auth] Acesso negado para ${user.id}: vínculo inativo, excluído ou sem papel`);
    return { userId: null, userRoles: [], error: jsonResponse({ error: "Acesso não autorizado" }, 403) };
  }

  console.log(`[crm-auth] Usuário autenticado: ${user.id}, papéis=${userRoles.length}`);
  return { userId: user.id, userRoles };
}

// ============================================
// FILTER BUILDER (shared by all operations)
// ============================================

function applyFilters(query: any, filters: Record<string, unknown>): any {
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === "object" && value !== null) {
      const f = value as Record<string, unknown>;
      if ("in" in f) query = query.in(key, f.in as unknown[]);
      if ("ilike" in f) query = query.ilike(key, f.ilike as string);
      if ("eq" in f) query = query.eq(key, f.eq);
      if ("neq" in f) query = query.neq(key, f.neq as string);
      if ("gt" in f) query = query.gt(key, f.gt as string);
      if ("gte" in f) query = query.gte(key, f.gte as string);
      if ("lt" in f) query = query.lt(key, f.lt as string);
      if ("lte" in f) query = query.lte(key, f.lte as string);
      if ("not_null" in f) query = query.not(key, "is", null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function applyOrdering(query: any, orderBy: CrmQuery["orderBy"]): any {
  const orderings = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return orderings.reduce((currentQuery, ordering) => {
    if (typeof ordering === "string") return currentQuery.order(ordering);
    return currentQuery.order(ordering.column, { ascending: ordering.ascending ?? true });
  }, query);
}

function applySearch(query: any, search: NonNullable<CrmQuery["search"]>): any {
  if (!search.term) return query;
  if (search.columns?.length) {
    return query.or(buildCompanySearchOr(search.columns, search.term));
  }
  if (search.column) return query.ilike(search.column, `%${search.term}%`);
  throw new Error("Search requires a column or a non-empty columns list");
}

// ============================================
// OPTIONAL QUOTES MODULE FALLBACKS
// ============================================

function isOptionalQuoteTable(table: string): boolean {
  return OPTIONAL_QUOTE_TABLES.has(table);
}

function isMissingTableError(error: PostgrestLikeError | null | undefined, table: string): boolean {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "PGRST205" || message.includes(`Could not find the table 'public.${table}' in the schema cache`);
}

function getOptionalTableMessage(table: string): string {
  return `Módulo de orçamentos indisponível no CRM externo (${table})`;
}

function createOptionalSelectFallback(table: string, isSingleRecord = false): Response {
  const warning = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${warning} — retornando fallback vazio para leitura.`);

  return jsonResponse({
    data: isSingleRecord ? null : [],
    count: 0,
    unavailable: true,
    warning,
  });
}

function createOptionalWriteError(table: string): Response {
  const error = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${error} — bloqueando operação de escrita.`);
  return jsonResponse({ error }, 503);
}

// ============================================
// QUOTE NUMBER GENERATOR
// ============================================

async function generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const now = new Date();
  const yearShort = String(now.getFullYear()).slice(-2);

  const { data: lastQuotes } = await crm
    .from("quotes")
    .select("quote_number")
    .ilike("quote_number", `%/${yearShort}`)
    .order("quote_number", { ascending: false })
    .limit(50);

  let maxNum = 10000;
  if (lastQuotes?.length) {
    for (const row of lastQuotes) {
      const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
  }

  const generatedNumber = `${maxNum + 1}/${yearShort}`;
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    if (!row.quote_number || row.quote_number === "") {
      row.quote_number = generatedNumber;
    }
  }
}

// ============================================
// OPERATION HANDLERS
// ============================================

async function handleBatch(crm: SupabaseClient, queries: BatchQuery[]): Promise<Response> {
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: "Batch limited to 10 queries max" }, 400);
  }

  const batchStart = performance.now();
  const results = await Promise.all(
    queries.map(async (q, idx) => {
      if (!q.table || !ALLOWED_TABLES.includes(q.table)) {
        return { success: false, error: `Table '${q.table}' not allowed` };
      }
      try {
        const queryStart = performance.now();
        let query = crm.from(q.table).select(q.select || "*");

        if (q.filters) query = applyFilters(query, q.filters);
        if ((q.search?.column || q.search?.columns?.length) && q.search?.term) {
          query = applySearch(query, q.search);
        }
        if (q.orderBy) query = applyOrdering(query, q.orderBy);
        if (q.limit) query = query.limit(q.limit);
        if (q.offset) query = query.range(q.offset, q.offset + (q.limit || 50) - 1);

        const { data, error } = await query;
        const duration = Math.round(performance.now() - queryStart);

        if (error) {
          if (isOptionalQuoteTable(q.table) && isMissingTableError(error, q.table)) {
            const warning = getOptionalTableMessage(q.table);
            console.warn(`[batch] Query ${idx} (${q.table}) optional table missing — fallback vazio.`);
            return {
              success: true,
              unavailable: true,
              warning,
              data: { records: [], count: 0 },
            };
          }

          console.error(`[batch] Query ${idx} (${q.table}) error code=${error.code ?? "unknown"}`);
          return { success: false, error: "query_failed" };
        }
        console.log(`[batch] Query ${idx} (${q.table}) ${duration}ms, ${(data || []).length} records`);
        return { success: true, data: { records: data || [], count: (data || []).length } };
      } catch (err: unknown) {
        console.error(
          `[batch] Query ${idx} (${q.table}) failed kind=${err instanceof Error ? err.name : "unknown"}`,
        );
        return { success: false, error: "query_failed" };
      }
    })
  );

  console.log(`[batch] Total: ${Math.round(performance.now() - batchStart)}ms for ${queries.length} queries`);
  return jsonResponse({ success: true, results });
}

async function handleInsert(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, data, returning } = body;
  if (!data) return jsonResponse({ error: "Insert requires 'data' field" }, 400);

  if (table === "quotes") {
    await generateQuoteNumber(crm, data);
  }

  const { data: result, error } = await crm.from(table).insert(data as any).select(returning || "*");

  // Diagnose result shape BEFORE doing anything else so GenericStringError
  // payloads (and other anomalies) are visible immediately in runtime logs.
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleInsert", table, operation: "insert", returning: returning || "*" },
      diag,
    );
  }

  // Fix quote_number if it was overridden by DB default
  if (!error && table === "quotes") {
    const insertedRow = firstRowAsRecord(result);
    if (insertedRow) {
      const sourceRow = Array.isArray(data) ? toRecord(data[0]) : toRecord(data);
      const targetNumber = sourceRow?.quote_number;

      if (targetNumber && targetNumber !== "" && insertedRow.quote_number !== targetNumber) {
        await crm.from("quotes").update({ quote_number: targetNumber }).eq("id", insertedRow.id as string);
        insertedRow.quote_number = targetNumber;
      }
    }
  }

  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error(`CRM insert error code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "insert_failed" }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleUpdate(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, data, returning } = body;
  if (!data) return jsonResponse({ error: "Update requires 'data' field" }, 400);

  let query = crm.from(table).update(data as any);

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  }

  const { data: result, error } = await query.select(returning || "*");
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleUpdate", table, operation: "update", returning: returning || "*" },
      diag,
    );
  }
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error(`CRM update error code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "update_failed" }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleDelete(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters } = body;
  let query = crm.from(table).delete();

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  } else {
    return jsonResponse({ error: "Delete requires 'id' or 'filters' to prevent mass deletion" }, 400);
  }

  const { error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error(`CRM delete error code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "delete_failed" }, 500);
  }
  return jsonResponse({ data: null, success: true });
}

async function handleSelect(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, select, orderBy, limit, offset, search, relations, count: countMode, head } = body;
  const selectFields = select || (relations ? `${select || "*"}, ${relations}` : "*");
  
  console.log(
    `[SELECT] table=${table}, fields=${selectFields.split(",").length}, ` +
      `filter_keys=${filters ? Object.keys(filters).sort((left, right) => left.localeCompare(right, "pt-BR")).join(",") : "none"}, limit=${limit ?? "default"}`,
  );
  
  let query = crm.from(table).select(selectFields, {
    ...(countMode ? { count: countMode } : {}),
    ...(head ? { head } : {}),
  });

  if (id) {
    const { data, error } = await query.eq("id", id).single();
    if (error) {
      console.error(`[SELECT] single error code=${error.code ?? "unknown"}`);
      if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
        return createOptionalSelectFallback(table, true);
      }
      return jsonResponse(
        { error: error.code === "PGRST116" ? "record_not_found" : "select_failed" },
        error.code === "PGRST116" ? 404 : 500,
      );
    }
    return jsonResponse({ data, count: 1 });
  }

  if (filters) query = applyFilters(query, filters);
  if (search) query = applySearch(query, search);
  if (orderBy) query = applyOrdering(query, orderBy);
  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit || 50) - 1);

  const { data, error, count: resultCount, status, statusText } = await query;
  console.log(
    `[SELECT] result status=${status} statusText=${statusText} dataLength=${(data || []).length} ` +
      `errorCode=${error?.code ?? "none"} count=${resultCount ?? "unknown"}`,
  );
  
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    console.error(`CRM select error code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "select_failed" }, 500);
  }
  return jsonResponse({ data: data || [], count: resultCount });
}

async function handleSearch(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, search, select, filters, orderBy, limit } = body;
  if (!search?.column || !search?.term) {
    return jsonResponse({ error: "Search requires 'column' and 'term'" }, 400);
  }

  let query = crm.from(table).select(select || "*").ilike(search.column, `%${search.term}%`);
  if (filters) query = applyFilters(query, filters);
  if (orderBy) query = applyOrdering(query, orderBy);
  query = query.limit(limit || 50);

  const { data, error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    console.error(`CRM search error code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "search_failed" }, 500);
  }
  return jsonResponse({ data: data || [], count: data?.length || 0 });
}

const QUOTE_COMPANY_SELECT =
  "id, title, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url";
const QUOTE_CONTACT_SELECT = "id, first_name, last_name, full_name, cargo";

interface QuoteDirectoryContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  cargo: string | null;
}

interface QuoteDirectoryChannelRow {
  contact_id: string;
  is_primary: boolean | null;
  created_at: string | null;
  email?: string | null;
  numero?: string | null;
}

function displayCompanyName(company: Record<string, unknown>): string {
  return String(company.title || company.nome_fantasia || company.razao_social || "");
}

function firstChannelByContact(
  rows: QuoteDirectoryChannelRow[] | null,
  field: "email" | "numero",
): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of rows ?? []) {
    const value = row[field];
    if (!result.has(row.contact_id) && typeof value === "string" && value.trim()) {
      result.set(row.contact_id, value);
    }
  }
  return result;
}

async function handleQuoteCompanies(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const limit = body.limit ?? 100;
  const offset = body.offset ?? 0;
  let query = crm
    .from("companies")
    .select(QUOTE_COMPANY_SELECT)
    .eq("is_customer", true)
    .is("deleted_at", null)
    .order("razao_social", { ascending: true });

  if (body.companyId) query = query.eq("id", body.companyId);
  if (body.term) {
    query = query.or(
      buildCompanySearchOr(["razao_social", "nome_fantasia", "cnpj", "ramo_atividade"], body.term),
    );
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    console.error(`[quote-directory] companies query_failed code=${error.code ?? "unknown"}`);
    return jsonResponse({ error: "quote_directory_failed" }, 500);
  }

  const companies = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: displayCompanyName(row),
    razao_social: String(row.razao_social ?? ""),
    nome_fantasia: row.nome_fantasia == null ? null : String(row.nome_fantasia),
    ramo_atividade: row.ramo_atividade == null ? null : String(row.ramo_atividade),
    cnpj: row.cnpj == null ? null : String(row.cnpj),
    logo_url: row.logo_url == null ? null : String(row.logo_url),
  }));
  return jsonResponse({ data: companies, count: companies.length });
}

async function handleQuoteContacts(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const companyId = body.companyId!;
  const companyResult = await crm
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("is_customer", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (companyResult.error) {
    console.error(
      `[quote-directory] company validation_failed code=${companyResult.error.code ?? "unknown"}`,
    );
    return jsonResponse({ error: "quote_directory_failed" }, 500);
  }
  if (!companyResult.data) return jsonResponse({ error: "customer_not_found" }, 404);

  const contactsResult = await crm
    .from("contacts")
    .select(QUOTE_CONTACT_SELECT)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("first_name", { ascending: true })
    .limit(body.limit ?? 50);
  if (contactsResult.error) {
    console.error(
      `[quote-directory] contacts query_failed code=${contactsResult.error.code ?? "unknown"}`,
    );
    return jsonResponse({ error: "quote_directory_failed" }, 500);
  }

  const contactRows = (contactsResult.data ?? []) as QuoteDirectoryContactRow[];
  const contactIds = contactRows.map((contact) => contact.id);
  if (contactIds.length === 0) return jsonResponse({ data: [], count: 0 });

  const [emailsResult, phonesResult] = await Promise.all([
    crm
      .from("contact_emails")
      .select("contact_id, email, is_primary, created_at")
      .in("contact_id", contactIds)
      .order("is_primary", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true }),
    crm
      .from("contact_phones")
      .select("contact_id, numero, is_primary, created_at")
      .in("contact_id", contactIds)
      .order("is_primary", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);
  if (emailsResult.error || phonesResult.error) {
    const code = emailsResult.error?.code ?? phonesResult.error?.code ?? "unknown";
    console.error(`[quote-directory] channels query_failed code=${code}`);
    return jsonResponse({ error: "quote_directory_failed" }, 500);
  }

  const emails = firstChannelByContact(
    emailsResult.data as QuoteDirectoryChannelRow[] | null,
    "email",
  );
  const phones = firstChannelByContact(
    phonesResult.data as QuoteDirectoryChannelRow[] | null,
    "numero",
  );
  const contacts = contactRows.map((contact) => ({
    id: contact.id,
    name:
      contact.full_name ||
      [contact.first_name, contact.last_name].filter(Boolean).join(" "),
    cargo: contact.cargo,
    email: emails.get(contact.id) ?? null,
    phone: phones.get(contact.id) ?? null,
  }));
  return jsonResponse({ data: contacts, count: contacts.length });
}

async function handleQuoteDirectory(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  if (body.action === "companies") return handleQuoteCompanies(crm, body);
  if (body.action === "contacts") return handleQuoteContacts(crm, body);
  return jsonResponse({ error: "quote_directory_action_invalid" }, 400);
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve((req) => {
    // Extrai/gera o request-id e roda todo o resto dentro do AsyncLocalStorage,
  // garantindo que jsonResponse() o injete em todas as respostas e logs
  // possam prefixá-lo via currentRequestId().
  const requestId = getOrCreateRequestId(req);
  return requestCtx.run({ requestId }, async () => {
    corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId } });
    }

  // ─────────────────────────────────────────────────────────────────
  // PING público expõe somente saúde agregada. Diagnósticos detalhados exigem
  // autenticação e papel dev, antes de revelar estado interno ou credenciais.
  //
  //   GET  ?op=ping  | POST { operation:"ping" }  → { ok, status }
  //   GET  ?op=diag  | POST { operation:"diag" }  → snapshot completo de
  //     métricas de cold vs warm path do isolate atual:
  //       boot.client_build_ms    — tempo p/ instanciar o SupabaseClient
  //       boot.warmup_started_at_ms — delta desde boot quando warmup começou
  //       boot.warmup_ms          — duração do warmup query
  //       boot.warmup_ok / warmup_error
  //       runtime.first_request_ms — duração da 1ª request real pós-boot
  //       isolate.age_ms / request_count / cold_request_count
  // ─────────────────────────────────────────────────────────────────
  const diagOp = await detectDiagOp(req);
  if (diagOp === "ping") {
    return jsonResponse({ ok: true, status: crmWarmupCompleted ? "ready" : "starting" });
  }
  if (diagOp) {
    const diagnosticAuth = await authenticateRequest(req);
    if (diagnosticAuth.error) return diagnosticAuth.error;
    if (!diagnosticAuth.userRoles.includes("dev")) {
      return jsonResponse({ error: "Diagnóstico restrito a desenvolvedores" }, 403);
    }
  }
  if (diagOp === "diag") {
    return jsonResponse(buildDiagSnapshot());
  }
  if (diagOp === "breaker_status") {
    // Status de TODOS os breakers registrados neste isolate (atualmente: "crm-db").
    // Bypass total (igual a ping/diag) — precisa funcionar mesmo com breaker OPEN.
    const all = getAllBreakerStatuses();
    const primary = all.find((b) => b.name === "crm-db") ?? all[0] ?? null;
    return jsonResponse({
      ok: true,
      ts: Date.now(),
      // Forma "achatada" pedida pelo painel (estado primário do crm-db).
      state: primary?.state ?? "UNKNOWN",
      failures: primary?.failures ?? 0,
      openedAt: primary?.openedAt ?? 0,
      willResetAt: primary?.willResetAt ?? null,
      // Bloco completo + lista de todos (futuro-prova caso outro breaker seja adicionado).
      breaker: primary,
      all,
    });
  }
  if (diagOp === "creds_health") {
    return jsonResponse(await buildCredsHealthSnapshot());
  }

  // Marca início da request real (pós-diag) para medir cold vs warm path.
  // `was_cold` = true para a 1ª request real após o boot do isolate.
  const reqStartedAt = performance.now();
  const wasCold = requestCount === 0;
  requestCount++;
  if (wasCold) coldRequestCount++;
  console.log(`[crm-db-bridge] [req_id=${requestId}] request_start method=${req.method} was_cold=${wasCold}`);

  if (!breaker.canRequest()) {
    return circuitOpenResponse("crm-db", corsHeaders);
  }

  try {
    // Anti-scraping: bot UA check + rate limit por IP (camada externa antes do auth)
    const protection = await runBotProtection(req, {
      endpoint: 'crm-db-bridge',
      maxRequests: 120,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    // Autoriza o shape completo antes de resolver qualquer credencial externa.
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }
    const parsed = CrmRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const body = parsed.data as CrmQuery;
    const { operation, table } = body;
    if (!canAccessCrmRequest(auth.userRoles, body)) {
      return jsonResponse({ error: "Permissão insuficiente para esta operação no CRM" }, 403);
    }

    // SSOT: DB-first via integration_credentials, env fallback via aliases.
    // Antes lia Deno.env.get() direto e ignorava credenciais salvas pela UI
    // (/admin/conexoes), causando 500 mesmo após o usuário cadastrar a CRM.
    const [urlRes, svcRes, anonRes] = await Promise.all([
      resolveCredential("EXTERNAL_CRM_URL"),
      resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
      resolveCredential("EXTERNAL_CRM_ANON_KEY"),
    ]);
    const CRM_URL = urlRes.value;
    const CRM_SERVICE_KEY = svcRes.value;
    const CRM_ANON_VAL = anonRes.value;
    const CRM_KEY = CRM_SERVICE_KEY || CRM_ANON_VAL;
    if (!CRM_URL || !CRM_KEY) {
      return jsonResponse({
        error: "CRM connection is not configured correctly",
        details: "Check EXTERNAL_CRM_URL and CRM keys in Connections. Placeholder or invalid URL values are ignored.",
      }, 500);
    }

    const CRM_ANON = CRM_ANON_VAL ?? "";

    // Log de resolução só na 1ª request por isolate (cold) ou se LOG_CRM_BRIDGE_VERBOSE=on.
    // Antes corria em toda request → poluía logs sem agregar info nova.
    // Use ?op=creds_health para snapshot sob demanda em qualquer momento.
    if (wasCold || Deno.env.get("LOG_CRM_BRIDGE_VERBOSE") === "on") {
      const using = CRM_SERVICE_KEY ? "SERVICE_KEY" : "ANON_KEY";
      const keySource = CRM_SERVICE_KEY ? svcRes.source : anonRes.source;
      let urlPrefix = "invalid";
      try {
        urlPrefix = new URL(CRM_URL).origin;
      } catch {
        urlPrefix = "invalid";
      }
      console.log(JSON.stringify({
        evt: "crm-creds-resolved",
        url_source: urlRes.source,
        url_via_alias: urlRes.resolved_name !== "EXTERNAL_CRM_URL",
        url_prefix: urlPrefix,
        using,
        key_source: keySource,
        keys_match: CRM_SERVICE_KEY === CRM_ANON,
      }));
    }

    // Reusa client cacheado no escopo do módulo (singleton por isolate).
    // Warm-up no boot já abriu TLS+handshake, então a primeira request não
    // paga cold-start. Em rajada paralela, fetch keep-alive evita re-handshake.
    const crm = await getCrmClient();
    if (!crm) {
      return jsonResponse({
        error: "CRM connection is not configured correctly",
        details: "The backend could not initialize the CRM client because the saved URL/key pair is missing or invalid.",
      }, 500);
    }

    // Batch handler (no table validation needed — done per-query inside)
    if (operation === "batch") {
      return handleBatch(crm, body.queries || []);
    }

    if (operation === "quote_directory") {
      const response = await handleQuoteDirectory(crm, body);
      if (response.status >= 500) breaker.recordFailure(); else breaker.recordSuccess();
      return response;
    }

    // Table whitelist
    if (!ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }, 403);
    }

    // Route to operation handler
    let response: Response;
    switch (operation) {
      case "insert": response = await handleInsert(crm, body); break;
      case "update": response = await handleUpdate(crm, body); break;
      case "delete": response = await handleDelete(crm, body); break;
      case "select": response = await handleSelect(crm, body); break;
      case "search": response = await handleSearch(crm, body); break;
      default: return jsonResponse({ error: `Operation '${operation}' not supported.` }, 400);
    }
    if (response.status >= 500) breaker.recordFailure(); else breaker.recordSuccess();

    // Captura métricas de cold vs warm path para a 1ª request real do isolate.
    const elapsed = Math.round(performance.now() - reqStartedAt);
    if (wasCold) {
      firstRequestMs = elapsed;
      firstRequestStartedAtMs = Math.round(reqStartedAt - isolateMonoStart);
      console.log(
        `[crm-runtime] [req_id=${requestId}] first_request_ms=${elapsed} was_cold=true ` +
          `op=${operation} table=${table ?? '-'} ` +
          `client_build_ms=${clientBuildMs} warmup_ms=${warmupMs} warmup_ok=${warmupOk}`,
      );
    } else {
      console.log(
        `[crm-runtime] [req_id=${requestId}] request_ms=${elapsed} was_cold=false ` +
          `op=${operation} table=${table ?? '-'} ` +
          `request_count=${requestCount}`,
      );
    }
    return response;
  } catch (error: unknown) {
    breaker.recordFailure();
    const elapsed = Math.round(performance.now() - reqStartedAt);
    console.error(
      `[crm-runtime] [req_id=${requestId}] error_ms=${elapsed} was_cold=${wasCold} ` +
        `kind=${error instanceof Error ? error.name : "unknown"}`,
    );
    return jsonResponse({ error: "internal_error" }, 500);
  }
  });
});
