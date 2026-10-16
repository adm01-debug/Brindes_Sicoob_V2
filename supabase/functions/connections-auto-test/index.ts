import { getCorsHeaders } from "../_shared/cors.ts";
import { requireInternalService } from "../_shared/internal-service-auth.ts";
// connections-auto-test: cron-driven. Re-tests every enabled connection that
// can operate or recover (`active`, `degraded` and `error`) and updates last_test_* fields +
// inserts a row in `connection_test_history` with triggered_by='cron'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  ConnectionTestPersistenceError,
  type ConnectionType,
  isTransientFailure,
  persistConnectionTestResult,
  runConnectionTest,
  type RunResult,
} from "../_shared/connection-test-runner.ts";
import { resolveTimeout } from "../_shared/connection-timeouts.ts";
import {
  assertServiceClient as sharedAssertServiceClient,
  castSupabaseClient,
  type CompatibleSupabaseClient,
  type ServiceClient,
} from "../_shared/supabase-client-adapter.ts";

// ────────────────────────────────────────────────────────────────────────────
// Schema-validated service client (re-exports do adapter compartilhado)
// ────────────────────────────────────────────────────────────────────────────
// As definições agora vivem em `_shared/supabase-client-adapter.ts` para que
// outras edge functions possam reusar o mesmo padrão sem duplicação.
// Re-exportamos aqui para preservar a API pública desta função (callers
// internos continuam importando `ServiceClient` / `CompatibleSupabaseClient` /
// `assertServiceClient` deste módulo).
export type { CompatibleSupabaseClient, ServiceClient };
export function assertServiceClient(
  client: unknown,
): asserts client is ServiceClient {
  sharedAssertServiceClient(client, "connections-auto-test");
}

const BATCH_SIZE = 5;
export const AUTO_TESTABLE_CONNECTION_STATUSES = [
  "active",
  "degraded",
  "error",
] as const;
// Backoff entre tentativas: dois atrasos representam uma tentativa inicial e
// duas retentativas. O índice N é o atraso antes da tentativa N+2.
const RETRY_BACKOFF_MS = [500, 1500] as const;
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1;

export interface ActiveConnection {
  id: string;
  type: string;
  name: string;
  env_key: string | null;
  config: Record<string, unknown> | null;
  created_by: string;
}

export interface BatchTestResult {
  id: string;
  ok: boolean;
  probe_ok: boolean;
  persisted: boolean;
  latency_ms: number | null;
  attempts: number;
  persistence_error?: boolean;
  error?: string;
}

export interface ProcessBatchDependencies {
  runTest?: typeof runConnectionTest;
  persistResult?: typeof persistConnectionTestResult;
  sleep?: (delayMs: number) => Promise<void>;
}

export function processBatch<
  // deno-lint-ignore no-explicit-any
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public" & string
    : string & keyof Database,
>(
  service: CompatibleSupabaseClient<Database, SchemaName>,
  batch: ActiveConnection[],
  dependencies: ProcessBatchDependencies = {},
): Promise<BatchTestResult[]> {
  // runConnectionTest exige `SupabaseClient` com schema 'public' (default).
  // O adapter compartilhado faz o narrow estruturalmente seguro uma única vez.
  const serviceForRunner = castSupabaseClient(service);
  const runTest = dependencies.runTest ?? runConnectionTest;
  const persistResult = dependencies.persistResult ??
    persistConnectionTestResult;
  const sleep = dependencies.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, delayMs)));

  return Promise.all(batch.map(async (conn) => {
    const t0 = Date.now();
    let probe: RunResult | undefined;
    let attempt = 1;
    try {
      const cfg = (conn.config && typeof conn.config === "object")
        ? Object.fromEntries(
          Object.entries(conn.config as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, v as string]),
        )
        : {};
      const connType = conn.type as ConnectionType;
      const perTypeTimeout = resolveTimeout(connType);
      const baseArgs = {
        type: connType,
        config: cfg,
        env_key: (conn.env_key as "promobrind" | "crm" | null) ?? undefined,
        connection_id: conn.id,
        created_by: conn.created_by,
        triggered_by: "cron" as const,
        service: serviceForRunner,
        timeoutMs: perTypeTimeout,
      };

      // Probe up to MAX_ATTEMPTS times. Each attempt skips persistence so we
      // don't write intermediate "failed" rows in connection_test_history;
      // only the final outcome is persisted with the correct attempts count.
      probe = await runTest({
        ...baseArgs,
        attempts: 1,
        skipPersistence: true,
      });
      while (!probe.ok && isTransientFailure(probe) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 1000);
        attempt += 1;
        probe = await runTest({
          ...baseArgs,
          attempts: attempt,
          skipPersistence: true,
        });
      }

      // Persiste exatamente o resultado do último probe. Isso evita uma chamada
      // adicional ao serviço externo que poderia divergir do resultado registrado.
      const final = await persistResult(
        { ...baseArgs, attempts: attempt },
        probe,
      );

      console.log(JSON.stringify({
        evt: "auto-test",
        type: conn.type,
        name: conn.name,
        ok: final.ok,
        status: final.status,
        latency_ms: final.latency_ms,
        timeout_ms: perTypeTimeout,
        wall_ms: Date.now() - t0,
        attempts: attempt,
        retried: attempt > 1,
        error: final.error,
        error_kind: final.error_kind,
      }));
      return {
        id: conn.id,
        ok: final.ok,
        probe_ok: final.ok,
        persisted: true,
        latency_ms: final.latency_ms ?? null,
        attempts: attempt,
      };
    } catch (err) {
      const persistenceError = err instanceof ConnectionTestPersistenceError;
      const errorCode = persistenceError
        ? "falha_ao_persistir_resultado"
        : "falha_interna_auto_teste";
      console.error(JSON.stringify({
        evt: "auto-test-error",
        id: conn.id,
        type: conn.type,
        error: errorCode,
        persistence_stage: persistenceError ? err.stage : undefined,
      }));
      return {
        id: conn.id,
        ok: false,
        probe_ok: probe?.ok ?? false,
        persisted: false,
        latency_ms: probe?.latency_ms ?? null,
        attempts: attempt,
        persistence_error: persistenceError,
        error: errorCode,
      };
    }
  }));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "metodo_nao_permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // O gateway pode aceitar JWTs segundo uma configuração antiga. O cron e
  // qualquer chamada interna precisam provar posse do segredo antes que esta
  // função crie um cliente service_role.
  const denied = await requireInternalService(req);
  if (denied) return denied;

  const startedAt = Date.now();
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Validação de tipo (estática + runtime) antes de qualquer chamada batch:
    // garante que o client tem a forma esperada por processBatch / runConnectionTest.
    assertServiceClient(service);

    const { data: active, error } = await service
      .from("external_connections")
      .select("id, type, name, env_key, config, created_by")
      .in("status", [...AUTO_TESTABLE_CONNECTION_STATUSES])
      .eq("auto_test_enabled", true);
    if (error) throw error;

    const conns = (active ?? []) as ActiveConnection[];
    if (conns.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          tested: 0,
          skipped: 0,
          ok_count: 0,
          failed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: BatchTestResult[] = [];
    for (let i = 0; i < conns.length; i += BATCH_SIZE) {
      const batch = conns.slice(i, i + BATCH_SIZE);
      const r = await processBatch(service, batch);
      results.push(...r);
    }

    const ok_count = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => r.persisted && !r.probe_ok).length;
    const persistence_failed = results.filter((r) =>
      r.persistence_error
    ).length;
    const internal_errors = results.filter((r) =>
      !r.persisted && !r.persistence_error
    ).length;
    const retried = results.filter((r) => r.attempts > 1).length;
    const recovered = results.filter((r) => r.ok && r.attempts > 1).length;
    const summary = {
      ok: persistence_failed === 0 && internal_errors === 0,
      tested: results.length,
      ok_count,
      failed,
      persistence_failed,
      internal_errors,
      retried,
      recovered,
      duration_ms: Date.now() - startedAt,
    };
    console.log(JSON.stringify({ evt: "auto-test-summary", ...summary }));

    return new Response(JSON.stringify(summary), {
      status: summary.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    console.error(JSON.stringify({ evt: "auto-test-fatal", error: msg }));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
