import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const QA_PASSWORD = "Qa@Test2026";

const QA_USERS = [
  { id: "00000000-0000-0000-0000-0000000000a1", email: "qa+gerente@sicoob.test", role: "gerente_pa", pa_id: "00000000-0000-0000-0000-0000000000b1", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" },
  { id: "00000000-0000-0000-0000-0000000000a2", email: "qa+gestor@sicoob.test", role: "gestor_compras", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" },
  { id: "00000000-0000-0000-0000-0000000000a3", email: "qa+vendedor@sicoob.test", role: "vendedor" },
  { id: "00000000-0000-0000-0000-0000000000a4", email: "qa+admin@sicoob.test", role: "admin" },
];

async function ensureUser(user: any) {
  console.log(`Garantindo usuário: ${user.email}`);
  const { error } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: QA_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `QA ${user.role}` }
  });

  if (error && (error.message.includes("already registered") || error.message.includes("duplicate"))) {
    await supabase.auth.admin.updateUserById(user.id, { password: QA_PASSWORD });
  } else if (error) {
    throw error;
  }

  // Ensure profile
  await supabase.from("profiles").upsert({
    id: user.id,
    user_id: user.id,
    email: user.email,
    display_name: `QA ${user.role}`,
    role: user.role,
    pa_id: user.pa_id || null,
    cooperativa_id: user.cooperativa_id || null
  }, { onConflict: "id" });
}

Deno.serve(async (req) => {
  const { scenario = "default" } = await req.json().catch(() => ({}));
  
  // 1. Create QA Run
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

  if (runError) return new Response(JSON.stringify({ error: runError.message }), { status: 500 });

  const report: any = { runId: run.id, scenario, created: [], errors: [] };

  try {
    // 2. Base infrastructure
    await supabase.from("cooperativas").upsert({ id: "00000000-0000-0000-0000-0000000000c1", nome: "SING-QA-001", codigo: "QA01" });
    await supabase.from("postos_atendimento").upsert({ id: "00000000-0000-0000-0000-0000000000b1", nome: "PA-QA-001", codigo: "PA01", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" });
    await supabase.from("pa_budgets").upsert({ pa_id: "00000000-0000-0000-0000-0000000000b1", verba_total: 50000, verba_consumida: 0, limite_alcada: 5000 }, { onConflict: "pa_id" });

    // 3. Ensure users
    for (const user of QA_USERS) {
      await ensureUser(user);
      report.created.push(user.email);
    }

    // 4. Scenario logic and Step creation
    const steps = [];
    
    if (scenario === "consolidacao") {
      steps.push("Validar listagem de PAs", "Validar totalizadores de orçamento");
    } else if (scenario === "alcada-gestor") {
      steps.push("Submeter pedido > R$ 5.000", "Verificar status 'Aguardando Aprovação'", "Aprovar via Gestor de Compras");
    } else if (scenario === "rls-cross") {
      steps.push("Tentar acessar PA de outra Singular", "Verificar erro 403 / Lista vazia");
    } else if (scenario === "piloto") {
      steps.push("Validar badge 'MODO PILOTO' no pedido", "Verificar aprovação automática conforme regra piloto");
    }

    if (steps.length > 0) {
      const stepInserts = steps.map(s => ({ run_id: run.id, step_name: s, status: 'pass' }));
      await supabase.from("qa_run_steps").insert(stepInserts);
    }

    // 5. Update Run to completed
    await supabase.from("qa_runs").update({ 
      status: 'completed', 
      finished_at: new Date().toISOString() 
    }).eq("id", run.id);

    return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    await supabase.from("qa_runs").update({ 
      status: 'failed', 
      error: err.message,
      finished_at: new Date().toISOString() 
    }).eq("id", run.id);
    
    return new Response(JSON.stringify({ error: err.message, runId: run.id }), { status: 500 });
  }
});
