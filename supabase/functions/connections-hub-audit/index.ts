// supabase/functions/connections-hub-audit/index.ts
// Auditoria automatizada do Connections Hub — admin-only
// Verifica: tabelas, edge functions, cron jobs, triggers e calcula score 0-10.

import {
  getCorsHeaders,
  handleCorsPreflightIfNeeded,
} from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
} from "../_shared/request-id.ts";
import { isCronEvidenceHealthy, probeEdgeFunction } from "./audit-core.ts";

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
  count?: number;
}

interface AuditReport {
  score: number;
  max_score: 10;
  passed: number;
  total: number;
  checks: {
    tables: CheckResult[];
    edge_functions: CheckResult[];
    cron_jobs: CheckResult[];
    triggers: CheckResult[];
  };
  generated_at: string;
}

const REQUIRED_TABLES = [
  "external_connections",
  "outbound_webhooks",
  "webhook_deliveries",
  "inbound_webhook_endpoints",
  "inbound_webhook_events",
  "mcp_api_keys",
  "integration_credentials",
];

const REQUIRED_FUNCTIONS = [
  "secrets-manager",
  "connection-tester",
  "webhook-dispatcher",
  "webhook-inbound",
  "mcp-server",
];

const REQUIRED_CRONS: Record<string, number> = {
  "webhook-retry-failed": 20,
  "webhook-logs-cleanup-daily": 36 * 60,
};

const REQUIRED_TRIGGERS: Record<string, string> = {
  quotes: "trg_dispatch_webhook_quotes",
  orders: "trg_dispatch_webhook_orders",
  discount_approval_requests: "trg_dispatch_webhook_discount",
  kit_share_tokens: "trg_dispatch_webhook_kit_share",
};

interface OperationalEvidence {
  cron_jobs?: Array<{
    name: string;
    active: boolean;
    last_status: string | null;
    last_run_at: string | null;
  }>;
  triggers?: Array<{
    table_name: string;
    trigger_name: string;
    enabled: boolean;
    function_name: string;
  }>;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  // X-Request-Id propagado em TODA resposta via spread de corsHeaders.
  const corsHeaders = {
    ...getCorsHeaders(req),
    [REQUEST_ID_HEADER]: requestId,
  };
  try {
    const auth = await authorize(req, {
      requireRole: "dev",
      enforceServerSide: true,
    });
    if (!auth.ok) {
      const headers = new Headers(auth.response.headers);
      headers.set(REQUEST_ID_HEADER, requestId);
      return new Response(auth.response.body, {
        status: auth.response.status,
        headers,
      });
    }

    const tableChecks: CheckResult[] = [];
    for (const t of REQUIRED_TABLES) {
      const { count, error } = await auth.supabaseAdmin
        .from(t as never)
        .select("*", { count: "exact", head: true });
      tableChecks.push({
        name: t,
        ok: !error,
        count: count ?? 0,
        detail: error?.message,
      });
    }

    // Funções: OPTIONS comprova que o endpoint está implantado sem executar sua
    // operação principal. 401/403/405 ainda são evidência de endpoint existente.
    const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const fnChecks: CheckResult[] = await Promise.all(
      REQUIRED_FUNCTIONS.map(async (name) => ({
        name,
        ...(projectUrl && serviceKey
          ? await probeEdgeFunction(projectUrl, serviceKey, name)
          : { ok: false, detail: "ambiente sem URL/chave para probe" }),
      })),
    );

    // Cron e triggers exigem catálogo do PostgreSQL. A RPC é somente leitura e
    // restrita a service_role. Se ela não existir/falhar, os checks ficam
    // explicitamente vermelhos, em vez de aprovar por presunção.
    const { data: evidenceData, error: evidenceError } = await auth
      .supabaseAdmin
      .rpc("get_connections_hub_operational_evidence" as never);
    const evidence = evidenceError
      ? null
      : evidenceData as unknown as OperationalEvidence;
    const evidenceUnavailable = evidenceError
      ? `evidência operacional indisponível: ${evidenceError.message}`
      : "evidência operacional ausente";

    const cronChecks: CheckResult[] = Object.entries(REQUIRED_CRONS).map(
      ([name, maxAgeMinutes]) => {
        const job = evidence?.cron_jobs?.find((item) => item.name === name);
        const ok = isCronEvidenceHealthy(job, maxAgeMinutes);
        return {
          name,
          ok,
          detail: job
            ? `active=${job.active}; last_status=${
              job.last_status ?? "sem execução"
            }; last_run_at=${
              job.last_run_at ?? "nunca"
            }; max_age_min=${maxAgeMinutes}`
            : evidenceUnavailable,
        };
      },
    );

    const triggerChecks: CheckResult[] = Object.entries(REQUIRED_TRIGGERS).map(
      ([tableName, triggerName]) => {
        const trigger = evidence?.triggers?.find((item) =>
          item.table_name === tableName && item.trigger_name === triggerName
        );
        const ok = Boolean(
          trigger?.enabled &&
            trigger.function_name === "dispatch_quote_webhook_event",
        );
        return {
          name: `${triggerName}@${tableName}`,
          ok,
          detail: trigger
            ? `enabled=${trigger.enabled}; function=${trigger.function_name}`
            : evidenceUnavailable,
        };
      },
    );

    const all = [...tableChecks, ...fnChecks, ...cronChecks, ...triggerChecks];
    const passed = all.filter((c) => c.ok).length;
    const total = all.length;
    const score = Math.round((passed / total) * 10 * 10) / 10;

    const report: AuditReport = {
      score,
      max_score: 10,
      passed,
      total,
      checks: {
        tables: tableChecks,
        edge_functions: fnChecks,
        cron_jobs: cronChecks,
        triggers: triggerChecks,
      },
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[connections-hub-audit] error", err);
    return new Response(JSON.stringify({ error: "erro_interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
