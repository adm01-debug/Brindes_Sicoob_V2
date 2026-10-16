import { getCorsHeaders } from "../_shared/cors.ts";
import { requireInternalService } from "../_shared/internal-service-auth.ts";
// connections-health-check: cron-driven (every 15min). Monitora a atualidade
// dos testes, notifica admins sobre falhas contínuas, webhooks auto-desativados
// e secrets sem rotação (>90 dias). Dedupe de 4h por chave para
// avoid notification spam. The "connection_down" incident additionally requires
// a continuous-failure window (configurable via RPC
// `set_connection_failure_window_minutes`, default 30min) to suppress flapping.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";
import {
  buildTestFreshnessIncident,
  type IncidentKey,
  type MonitoredConnection,
} from "./health-core.ts";

const DEDUPE_WINDOW_HOURS = 4;
const STALE_SECRET_DAYS = 90;
const DEFAULT_FAILURE_WINDOW_MINUTES = 30;

async function alreadyNotified(
  service:
    import("../_shared/supabase-client-adapter.ts").CompatibleSupabaseClient,
  userId: string,
  key: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000)
    .toISOString();
  const { data, error } = await service
    .from("workspace_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "integrations")
    .gte("created_at", since)
    .filter("metadata->>incident_key", "eq", key)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function notifyAdmins(
  service:
    import("../_shared/supabase-client-adapter.ts").CompatibleSupabaseClient,
  adminIds: string[],
  incident: IncidentKey,
): Promise<number> {
  let notified = 0;
  for (const userId of adminIds) {
    if (await alreadyNotified(service, userId, incident.key)) continue;
    const { error } = await service.from("workspace_notifications").insert({
      user_id: userId,
      title: incident.title,
      message: incident.message,
      type: incident.type,
      category: "integrations",
      action_url: "/admin/conexoes",
      metadata: {
        incident_key: incident.key,
        source: "connections-health-check",
      },
      is_read: false,
    });
    if (error) throw error;
    notified += 1;
  }
  return notified;
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
  const denied = await requireInternalService(req);
  if (denied) return denied;

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: admins, error: adminsError } = await service
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (adminsError) throw adminsError;
    const adminIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incidents: IncidentKey[] = [];

    // 1) Conexões habilitadas que nunca foram testadas ou cujo último teste
    // venceu. O cron responde 200 mesmo quando não encontra elegíveis; sem esta
    // evidência o monitor poderia ficar verde indefinidamente com `tested: 0`.
    const { data: monitored, error: monitoredError } = await service
      .from("external_connections")
      .select("id, name, type, last_test_at")
      .eq("auto_test_enabled", true)
      .in("status", ["active", "degraded", "error"]);
    if (monitoredError) throw monitoredError;
    for (const connection of (monitored ?? []) as MonitoredConnection[]) {
      const incident = buildTestFreshnessIncident(connection);
      if (incident) incidents.push(incident);
    }

    // 2) Auto-disabled outbound webhooks
    const { data: disabled, error: disabledError } = await service
      .from("outbound_webhooks")
      .select("id, name, auto_disabled_reason")
      .not("auto_disabled_at", "is", null)
      .eq("active", false);
    if (disabledError) throw disabledError;
    for (const w of disabled ?? []) {
      incidents.push({
        key: `webhook_disabled:${w.id}`,
        title: "Webhook desativado automaticamente",
        message: `${w.name} — ${
          w.auto_disabled_reason ?? "circuit breaker acionado"
        }.`,
        type: "error",
      });
    }

    // 3) Stale secrets (>90d sem rotação)
    const cutoff = new Date(
      Date.now() - STALE_SECRET_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: rotations, error: rotationsError } = await service
      .from("secret_rotation_log")
      .select("secret_name, rotated_at")
      .order("rotated_at", { ascending: false });
    if (rotationsError) throw rotationsError;
    // Considera a rotação mais recente de cada secret. Filtrar as linhas antes
    // da agregação marcaria falsamente um secret que já foi rotacionado.
    const lastBySecret = new Map<string, string>();
    for (const s of rotations ?? []) {
      const prev = lastBySecret.get(s.secret_name);
      if (!prev || s.rotated_at > prev) {
        lastBySecret.set(s.secret_name, s.rotated_at);
      }
    }
    for (const [secret_name, rotatedAt] of lastBySecret) {
      if (rotatedAt >= cutoff) continue;
      incidents.push({
        key: `stale_secret:${secret_name}`,
        title: "Secret precisa ser rotacionado",
        message:
          `${secret_name} sem rotação há mais de ${STALE_SECRET_DAYS} dias.`,
        type: "warning",
      });
    }

    // 4) Connections that have been failing CONTINUOUSLY for at least
    //    `failure_window_minutes` (configurable). A "connection_down" incident
    //    is only emitted if every recorded test inside that window failed —
    //    transient flaps that already recovered are ignored.
    let failureWindowMin = DEFAULT_FAILURE_WINDOW_MINUTES;
    try {
      const { data: rpcData } = await castRpcResult<{
        data: number | null;
        error: { message: string } | null;
      }>(service.rpc("get_connection_failure_window_minutes"));
      if (typeof rpcData === "number" && rpcData >= 0) {
        failureWindowMin = rpcData;
      }
    } catch (_) { /* keep default */ }

    if (failureWindowMin === 0) {
      // Window disabled → behave like the legacy "any failure in last hour" rule.
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: down, error: downError } = await service
        .from("external_connections")
        .select("id, name, type, last_test_message, last_test_at")
        .eq("last_test_ok", false)
        .gte("last_test_at", oneHourAgo);
      if (downError) throw downError;
      for (const c of down ?? []) {
        incidents.push({
          key: `connection_down:${c.id}`,
          title: `Conexão ${c.type} com erro`,
          message: `${c.name} — ${c.last_test_message ?? "ping falhou"}.`,
          type: "error",
        });
      }
    } else {
      const windowStart = new Date(Date.now() - failureWindowMin * 60 * 1000)
        .toISOString();
      const { data: candidates, error: candidatesError } = await service
        .from("external_connections")
        .select("id, name, type, last_test_message, last_test_at")
        .eq("last_test_ok", false);
      if (candidatesError) throw candidatesError;
      for (const c of candidates ?? []) {
        // Need at least one test inside the window AND zero successes inside it.
        const [historyResult, successesResult] = await Promise.all([
          service.from("connection_test_history")
            .select("id")
            .eq("connection_id", c.id)
            .gte("tested_at", windowStart)
            .limit(1),
          service.from("connection_test_history")
            .select("id", { count: "exact", head: true })
            .eq("connection_id", c.id)
            .eq("success", true)
            .gte("tested_at", windowStart),
        ]);
        if (historyResult.error) throw historyResult.error;
        if (successesResult.error) throw successesResult.error;
        const anyInWindow = historyResult.data;
        const successesInWindow = successesResult.count;
        const hasTests = (anyInWindow ?? []).length > 0;
        const hadSuccess = (successesInWindow ?? 0) > 0;
        if (!hasTests || hadSuccess) continue;

        incidents.push({
          key: `connection_down:${c.id}`,
          title: `Conexão ${c.type} com erro`,
          message:
            `${c.name} — falhando há ≥${failureWindowMin}min. Último erro: ${
              c.last_test_message ?? "ping falhou"
            }.`,
          type: "error",
        });
      }
    }

    let notified = 0;
    for (const inc of incidents) {
      notified += await notifyAdmins(service, adminIds, inc);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        incidents: incidents.length,
        admins: adminIds.length,
        notified,
        keys: incidents.map((i) => i.key),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("connections-health-check error:", err);
    return new Response(JSON.stringify({ error: "erro_interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
