import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name, x-request-id, x-client-timestamp, traceparent, tracestate, baggage",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "auth-integrity-check", requestId, req });

  try {
    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails)) {
      throw new Error("Emails array is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log.info("check_started", { emails_count: emails.length });
    
    const { data: integrityData, error: rpcError } = await supabase.rpc("get_test_auth_integrity", {
      test_emails: emails
    });

    if (rpcError) {
      log.error("rpc_failed", { err: rpcError });
      throw rpcError;
    }

    const results: Record<string, { isValid: boolean; reason?: string }> = {};

    integrityData.forEach((row: any) => {
      if (!row.exists_in_users) {
        results[row.email] = { isValid: false, reason: "Inexistente" };
      } else if (!row.has_identities) {
        results[row.email] = { isValid: false, reason: "Órfão (sem identidades)" };
      } else {
        results[row.email] = { isValid: true };
      }
    });

    log.info("check_ok", { results_count: Object.keys(results).length });

    return log.respond(new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }));
  } catch (err) {
    log.error("check_failed", { err: err.message });
    return log.respond(new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    }));
  }
});