import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails)) {
      throw new Error("Emails array is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica integridade: existe no auth.users E no auth.identities?
    // Agora usamos a RPC segura get_test_auth_integrity que consulta o banco diretamente
    
    const { data: integrityData, error: rpcError } = await supabase.rpc("get_test_auth_integrity", {
      test_emails: emails
    });

    if (rpcError) throw rpcError;

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

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
