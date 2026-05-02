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
    // Usamos uma query SQL via rpc para checar o schema auth que o SDK não expõe diretamente para queries complexas
    // Mas para simplificar e ser portátil, vamos usar o admin SDK para listar e verificar identidades
    
    const results: Record<string, { isValid: boolean; reason?: string }> = {};

    for (const email of emails) {
      // 1. Busca usuário pelo email
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        results[email] = { isValid: false, reason: "Inexistente" };
        continue;
      }

      // 2. Verifica se tem identidades vinculadas (essencial para login via password)
      // O SDK retorna identidades no objeto user
      const hasIdentities = user.identities && user.identities.length > 0;

      if (!hasIdentities) {
        results[email] = { isValid: false, reason: "Órfão (sem identidades)" };
      } else {
        results[email] = { isValid: true };
      }
    }

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
