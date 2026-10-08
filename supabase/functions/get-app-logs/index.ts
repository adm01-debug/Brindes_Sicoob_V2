import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "get-app-logs", requestId, req });
  log.info("fetch_logs_start");

  try {
    const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
    if (!auth.ok) return log.respond(auth.response);
    const supabase = auth.supabaseAdmin;

    const body = await req.json();
    const { severity, table_name, limit = 100, offset = 0 } = body;

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
