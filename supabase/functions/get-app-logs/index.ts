import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (authErr || !user) {
      log.warn("unauthorized_access_attempt");
      return log.respond(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders }));
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "dev") {
      log.warn("forbidden_access_attempt", { user_id: user.id, role: profile?.role });
      return log.respond(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders }));
    }

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
    log.error("fetch_logs_failed", { err: e.message });
    return log.respond(new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    }));
  }
});