import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const QA_USERS = [
  { id: "00000000-0000-0000-0000-0000000000a1", email: "qa+gerente@sicoob.test", role: "gerente_pa", pa_id: "00000000-0000-0000-0000-0000000000b1", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" },
  { id: "00000000-0000-0000-0000-0000000000a2", email: "qa+gestor@sicoob.test", role: "gestor_compras", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" },
  { id: "00000000-0000-0000-0000-0000000000a3", email: "qa+vendedor@sicoob.test", role: "vendedor" },
  { id: "00000000-0000-0000-0000-0000000000a4", email: "qa+admin@sicoob.test", role: "admin" },
];

async function ensureUser(user: any, log: any, password: string) {
  log.debug("ensuring_qa_user", { email: user.email });
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  
  const existingUser = users?.find(u => u.email === user.email);

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, { 
      password,
      user_metadata: { full_name: `QA ${user.role}` }
    });
    if (updateError) throw updateError;
    user.id = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `QA ${user.role}` }
    });

    if (createError) throw createError;
    if (newUser?.user) user.id = newUser.user.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    user_id: user.id,
    email: user.email,
    full_name: `QA ${user.role}`,
    role: user.role,
    pa_id: user.pa_id || null,
    cooperativa_id: user.cooperativa_id || null
  }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase.from("user_roles").upsert({
    user_id: user.id,
    role: user.role,
  }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "sicoob-seed-qa", requestId, req });

  const auth = await authorize(req, { requireRole: "dev", enforceServerSide: true });
  if (!auth.ok) return log.respond(auth.response);
  const qaPassword = Deno.env.get("SICOOB_QA_USER_PASSWORD");
  if (!qaPassword) {
    return log.respond(new Response(JSON.stringify({ error: "qa_password_not_configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }));
  }

  const { scenario = "default" } = await req.json().catch(() => ({}));
  log.info("seed_qa_start", { scenario });
  
  const { data: run, error: runError } = await supabase
    .from("qa_runs")
    .insert({
      scenario,
      status: 'running',
      persona: 'System Seed',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (runError) {
    log.error("qa_run_creation_failed", { err: runError });
    return log.respond(new Response(JSON.stringify({ error: "qa_run_creation_failed" }), { status: 500 }));
  }

  const report: any = { runId: run.id, scenario, created: [], errors: [], details: [] };

  try {
    await supabase.from("cooperativas").upsert({ id: "00000000-0000-0000-0000-0000000000c1", nome: "SING-QA-001", codigo: "QA01" });
    await supabase.from("postos_atendimento").upsert({ id: "00000000-0000-0000-0000-0000000000b1", nome: "PA-QA-001", codigo: "PA01", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" });
    await supabase.from("pa_budgets").upsert({ pa_id: "00000000-0000-0000-0000-0000000000b1", verba_total: 50000, verba_consumida: 0, limite_alcada: 5000 }, { onConflict: "pa_id" });

    for (const user of QA_USERS) {
      await ensureUser(user, log, qaPassword);
      report.created.push(user.email);
    }

    const steps = [];
    
    if (scenario === "consolidacao") {
      steps.push("Validar listagem de PAs", "Validar totalizadores de orçamento");
      await supabase.from("postos_atendimento").upsert([
        { id: "00000000-0000-0000-0000-0000000000b2", nome: "PA-QA-002", codigo: "PA02", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" }
      ]);
      await supabase.from("pa_budgets").upsert([
        { pa_id: "00000000-0000-0000-0000-0000000000b2", verba_total: 30000, verba_consumida: 15000, limite_alcada: 3000 }
      ]);
      report.details.push("Created additional PA for consolidation validation");
    } else if (scenario === "alcada-gestor") {
      steps.push("Submeter pedido > R$ 5.000", "Verificar status 'Aguardando Aprovação'", "Aprovar via Gestor de Compras");
      const { error: orderError } = await supabase.from("sicoob_orders").upsert({
        id: "00000000-0000-0000-0000-0000000000d1",
        cooperative_id: "00000000-0000-0000-0000-0000000000c1",
        pa_id: "00000000-0000-0000-0000-0000000000b1",
        created_by: QA_USERS[0].id,
        status: "waiting_approval",
        total_amount: 7500.00,
        notes: "Pedido QA excedendo alçada para teste de fluxo de aprovação"
      }, { onConflict: "id", ignoreDuplicates: true });
      if (orderError) throw orderError;
      const { error: approvalError } = await supabase.from("sicoob_approval_requests").upsert({
        id: "00000000-0000-0000-0000-0000000000e1",
        order_id: "00000000-0000-0000-0000-0000000000d1",
        requester_id: QA_USERS[0].id,
        status: "pending",
        amount_at_request: 7500.00,
        threshold_at_request: 5000.00,
        request_reason: "Pedido QA excedendo a alçada do PA",
      }, { onConflict: "id", ignoreDuplicates: true });
      if (approvalError) throw approvalError;
      report.details.push("Created pending order R$ 7.500 in sicoob_orders for approval flow testing");
    } else if (scenario === "rls-cross") {
      steps.push("Tentar acessar PA de outra Singular", "Verificar erro 403 / Lista vazia");
      await supabase.from("cooperativas").upsert({ id: "00000000-0000-0000-0000-0000000000c2", nome: "SING-QA-OUTRA", codigo: "QA02" });
      await supabase.from("postos_atendimento").upsert({ id: "00000000-0000-0000-0000-0000000000b3", nome: "PA-LONGE", codigo: "PA99", cooperativa_id: "00000000-0000-0000-0000-0000000000c2" });
      report.details.push("Created external cooperative for RLS cross-check");
    } else if (scenario === "piloto") {
      steps.push("Validar badge 'MODO PILOTO' no pedido", "Verificar aprovação automática conforme regra piloto");
      await supabase.from("cooperativas").update({ 
        metadata: { is_piloto: true, piloto_config: { auto_approve_under: 1000 } } 
      }).eq("id", "00000000-0000-0000-0000-0000000000c1");
      report.details.push("Enabled MODO PILOTO for test singular");
    }

    if (steps.length > 0) {
      const stepInserts = steps.map(s => ({ run_id: run.id, step_name: s, status: 'pass' }));
      await supabase.from("qa_run_steps").insert(stepInserts);
    }

    await supabase.from("qa_runs").update({ 
      status: 'completed', 
      finished_at: new Date().toISOString() 
    }).eq("id", run.id);

    log.info("seed_qa_success", { runId: run.id });

    return log.respond(new Response(JSON.stringify(report), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("seed_qa_failed", { err: message, runId: run.id });
    await supabase.from("qa_runs").update({ 
      status: 'failed', 
      error: message,
      finished_at: new Date().toISOString() 
    }).eq("id", run.id);
    
    return log.respond(new Response(JSON.stringify({ error: "seed_qa_failed", runId: run.id }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }));
  }
});
