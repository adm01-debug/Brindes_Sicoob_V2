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
  const log = createStructuredLogger({ fn: "e2e-auth-test", requestId, req });
  log.info("e2e_auth_test_start");

  const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
  if (!auth.ok) return log.respond(auth.response);

  try {
    const admin = auth.supabaseAdmin;
    const userClient = auth.supabaseUser;
    const user = auth.user;

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
    const message = e instanceof Error ? e.message : String(e);
    log.error("e2e_auth_test_failed", { err: message });
    return log.respond(new Response(JSON.stringify({ error: message }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }));
  }
});
