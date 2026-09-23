import { authorize } from "../_shared/authorize.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(withStructuredLogging("sicoob-approval-reconciliation", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method !== "POST") return json({ error: "metodo_nao_permitido" }, 405);

  const auth = await authorize(req, { requireRole: "supervisor", enforceServerSide: true });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }

  if (body.action === "list") {
    const health = await auth.supabaseAdmin.rpc("monitor_sicoob_approval_worker");
    if (health.error) return json({ error: "monitoramento_indisponivel" }, 503);
    const { data, error } = await auth.supabaseAdmin
      .from("sicoob_approval_deliveries")
      .select("id,request_id,event_kind,channel,state,attempts,last_error_code,provider_id,created_at,updated_at,reconciliation")
      .in("state", ["uncertain", "failed"])
      .is("reconciliation", null)
      .order("updated_at", { ascending: true })
      .limit(100);
    if (error) return json({ error: "fila_indisponivel" }, 503);
    const deliveries = (data ?? []).map((delivery) => ({
      ...delivery,
      destination_label: delivery.channel === "email" ? "E-mail configurado" : "Webhook Slack configurado",
    }));
    return json({ deliveries, workerHealth: health.data });
  }

  if (body.action !== "reconcile" || typeof body.deliveryId !== "string" || !uuid.test(body.deliveryId)
      || !["delivered", "requeue"].includes(String(body.resolution))
      || typeof body.reason !== "string" || body.reason.trim().length < 10 || body.reason.trim().length > 500
      || (body.resolution === "delivered" && (typeof body.providerId !== "string" || !body.providerId.trim()))) {
    return json({ error: "reconciliacao_invalida" }, 400);
  }

  const operator = `${auth.user.email ?? "sem-email"} (${auth.user.id})`.slice(0, 200);
  const { data, error } = await auth.supabaseAdmin.rpc("reconcile_sicoob_approval_delivery", {
    p_delivery_id: body.deliveryId,
    p_resolution: body.resolution,
    p_provider_id: typeof body.providerId === "string" ? body.providerId.trim() || null : null,
    p_reason: body.reason.trim(),
    p_operator: operator,
  });
  if (error) return json({ error: "reconciliacao_recusada" }, error.code === "P0002" ? 404 : 409);
  return json({ success: true, deliveryId: data });
}));
