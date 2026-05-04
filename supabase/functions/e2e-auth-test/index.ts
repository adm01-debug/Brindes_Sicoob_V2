import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "e2e-auth-test", requestId, req });
  log.info("e2e_auth_test_start");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    log.warn("missing_auth_header");
    return log.respond(new Response("Unauthorized", { status: 401, headers: corsHeaders }));
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      log.warn("invalid_jwt_token", { err: authErr?.message });
      return log.respond(new Response("Invalid user", { status: 401, headers: corsHeaders }));
    }

    const { data: profile } = await admin.from('profiles').select('role, cooperativa_id, pa_id').eq('user_id', user.id).single();
    
    const results = [];
    
    const { data: pas, error: paError } = await userClient.from('postos_atendimento').select('id').limit(1);
    results.push({ test: 'PA_SELECT', success: !paError, details: paError?.message });

    const { data: budgets, error: budgetError } = await userClient.from('pa_budgets').select('id').limit(1);
    results.push({ test: 'BUDGET_SELECT', success: !budgetError, count: budgets?.length });

    log.info("e2e_auth_test_ok", { user_id: user.id, role: profile?.role });

    return log.respond(new Response(JSON.stringify({
      user_role: profile?.role,
      results
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } }));
  } catch (e) {
    log.error("e2e_auth_test_failed", { err: e.message });
    return log.respond(new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }));
  }
});