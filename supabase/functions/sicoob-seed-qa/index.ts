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
  const { data, error } = await supabase.auth.admin.createUser({
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

  // Ensure user role
  await supabase.from("user_roles").upsert({ user_id: user.id, role: user.role }, { onConflict: "user_id,role" });

  // Ensure profile
  await supabase.from("profiles").upsert({
    user_id: user.id,
    email: user.email,
    full_name: `QA ${user.role}`,
    role: user.role,
    pa_id: user.pa_id || null,
    cooperativa_id: user.cooperativa_id || null
  }, { onConflict: "user_id" });
}

Deno.serve(async (req) => {
  const { scenario = "default" } = await req.json().catch(() => ({}));
  const report: any = { scenario, created: [], errors: [] };

  try {
    // 1. Cleanup
    const testIds = QA_USERS.map(u => u.id);
    await supabase.rpc("cleanup_test_auth_orphans", { test_ids: testIds });

    // 2. Base infrastructure
    await supabase.from("cooperativas").upsert({ id: "00000000-0000-0000-0000-0000000000c1", nome: "SING-QA-001", codigo: "QA01" });
    await supabase.from("postos_atendimento").upsert({ id: "00000000-0000-0000-0000-0000000000b1", nome: "PA-QA-001", codigo: "PA01", cooperativa_id: "00000000-0000-0000-0000-0000000000c1" });
    await supabase.from("pa_budgets").upsert({ pa_id: "00000000-0000-0000-0000-0000000000b1", verba_total: 5000, verba_consumida: 0, limite_alcada: 1000 }, { onConflict: "pa_id" });

    // 3. Ensure users
    for (const user of QA_USERS) {
      await ensureUser(user);
      report.created.push(user.email);
    }

    // 4. Scenarios
    if (scenario === "consolidacao") {
      // Create 3 approved quotes for PA-QA-001
      for (let i = 1; i <= 3; i++) {
        await supabase.from("quotes").insert({
          id: crypto.randomUUID(),
          user_id: QA_USERS[0].id,
          status: "aprovado",
          total: 100 * i,
          title: `Orçamento QA ${i}`
        });
      }
    } else if (scenario === "alcada-gestor") {
      // Create order > 10.000
      await supabase.from("sicoob_orders").insert({
        id: crypto.randomUUID(),
        pa_id: "00000000-0000-0000-0000-0000000000b1",
        user_id: QA_USERS[0].id,
        status: "enviado_gestor",
        total_amount: 15000,
        requires_manager_approval: true
      });
    }

    return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
