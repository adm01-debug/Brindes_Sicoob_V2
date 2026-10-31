import { authorize } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(withStructuredLogging("external-connections-sync", async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "metodo_nao_permitido" }, 405, corsHeaders);

  const access = await authorize(req, { requireRole: "supervisor", enforceServerSide: true });
  if (!access.ok) return access.response;

  const { data, error } = await access.supabaseAdmin.rpc("sync_external_connections_from_credentials", {
    _trigger_secret_name: null,
    _trigger_op: "manual",
    _trigger_user_id: access.user.id,
  });
  if (error) return json({ error: "sincronizacao_indisponivel" }, 503, corsHeaders);

  return json({ success: data?.ok === true, result: data }, data?.ok === true ? 200 : 503, corsHeaders);
}));
