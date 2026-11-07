import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_LIMIT = 500;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "get-app-logs", requestId, req });
  log.info("fetch_logs_start");

  try {
    const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
    if (!auth.ok) return log.respond(auth.response);
    const supabase = auth.supabaseAdmin;

    let body: { severity?: string; table_name?: string; limit?: number; offset?: number };
    try {
      body = await req.json();
    } catch {
      return log.respond(new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }));
    }
    const { severity, table_name } = body;
    const limit = Math.min(Math.max(Number(body.limit) || 100, 1), MAX_LIMIT);
    const offset = Math.max(Number(body.offset) || 0, 0);

    let query = supabase
      .from("query_telemetry")
      .select("*, request_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (severity && severity !== "all") {
      query = query.eq("severity", severity);
    }
    if (table_name) {
      query = query.ilike("table_name", `%${table_name}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      log.error("telemetry_query_failed", { err: error.message });
      throw error;
    }

    log.info("fetch_logs_ok", { count: data?.length, total: count });

    return log.respond(new Response(JSON.stringify({ logs: data, total: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("fetch_logs_failed", { err: message });
    return log.respond(new Response(JSON.stringify({ error: "fetch_logs_failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    }));
  }
});
