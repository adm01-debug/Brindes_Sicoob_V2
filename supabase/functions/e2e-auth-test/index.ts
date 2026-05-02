import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Invalid user", { status: 401 });

  // Testar acesso a tabelas Sicoob baseado no role do usuário logado
  const { data: profile } = await admin.from('profiles').select('role, cooperativa_id, pa_id').eq('user_id', user.id).single();
  
  const results = [];
  
  // Teste 1: Postos de Atendimento (Todos autenticados devem ver se ativos)
  const { data: pas, error: paError } = await userClient.from('postos_atendimento').select('id').limit(1);
  results.push({ test: 'PA_SELECT', success: !paError, details: paError?.message });

  // Teste 2: Budgets (Restrito)
  const { data: budgets, error: budgetError } = await userClient.from('pa_budgets').select('id').limit(1);
  results.push({ test: 'BUDGET_SELECT', success: !budgetError, count: budgets?.length });

  return new Response(JSON.stringify({
    user_role: profile?.role,
    results
  }), { headers: { "Content-Type": "application/json" } });
});
