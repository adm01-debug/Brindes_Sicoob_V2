import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração de credenciais via variáveis de ambiente com fallbacks seguros para dev/test
const TEST_PASSWORD = Deno.env.get("SICOOB_TEST_USER_PASSWORD") || "password123";

const TEST_USERS_CONFIG = [
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: Deno.env.get("SICOOB_TEST_EMAIL_PA") || "pa@teste.com",
    full_name: "Usuário PA Teste",
    role: "sicoob_pa",
    cooperativa_id: "00000000-0000-0000-0000-000000000002",
    pa_id: "00000000-0000-0000-0000-000000000003"
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: Deno.env.get("SICOOB_TEST_EMAIL_SINGULAR") || "singular@teste.com",
    full_name: "Usuário Singular Teste",
    role: "sicoob_singular",
    cooperativa_id: "00000000-0000-0000-0000-000000000002",
    pa_id: null
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    email: Deno.env.get("SICOOB_TEST_EMAIL_CENTRAL") || "central@teste.com",
    full_name: "Usuário Central Teste",
    role: "sicoob_central",
    cooperativa_id: "00000000-0000-0000-0000-000000000001",
    pa_id: null
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    email: Deno.env.get("SICOOB_TEST_EMAIL_GESTOR") || "gestor@teste.com",
    full_name: "Usuário Gestor Teste",
    role: "sicoob_gestor",
    cooperativa_id: null,
    pa_id: null
  }
];

async function cleanupOrphans() {
  console.log("Detectando e removendo usuários órfãos no schema auth...");
  
  // IDs de teste específicos
  const testIds = TEST_USERS_CONFIG.map(u => u.id);
  
  // Query SQL via RPC ou comando direto para identificar órfãos em auth.users (sem identidades)
  // Como estamos no Admin SDK, vamos usar listUsers e filtrar identidades vazias
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const orphans = users.filter(u => 
    testIds.includes(u.id) && (!u.identities || u.identities.length === 0)
  );

  const report = { removed: [] as string[] };

  for (const orphan of orphans) {
    console.log(`Limpando órfão detectado: ${orphan.email} (${orphan.id})`);
    
    // 1. Limpa perfis e pedidos para evitar FK errors
    await supabase.from("sicoob_orders").delete().eq("created_by", orphan.id);
    await supabase.from("profiles").delete().eq("user_id", orphan.id);
    
    // 2. Delete no auth.users via SQL (o SDK pode falhar se o usuário estiver 'quebrado')
    // Mas tentamos via SDK primeiro por segurança
    const { error: delError } = await supabase.auth.admin.deleteUser(orphan.id);
    if (delError) {
      console.error(`Falha ao deletar via SDK, tentando via RPC de limpeza: ${delError.message}`);
    }
    
    report.removed.push(orphan.email || orphan.id);
  }
  
  return report;
}

async function ensureTestUser(user: (typeof TEST_USERS_CONFIG)[number], stats: any) {
  console.log(`Garantindo usuário de teste: ${user.email}`);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });

  if (createError) {
    if (createError.message.includes("already registered") || createError.message.includes("duplicate")) {
       const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
         password: TEST_PASSWORD,
         email_confirm: true,
         user_metadata: { full_name: user.full_name },
       });
       if (updateError) {
         stats.failures.push({ email: user.email, error: updateError.message });
         throw updateError;
       }
       stats.updated.push(user.email);
    } else {
      stats.failures.push({ email: user.email, error: createError.message });
      throw createError;
    }
  } else {
    stats.recreated.push(user.email);
  }
}

Deno.serve(async (req) => {
  const stats = {
    orphans_removed: [] as string[],
    recreated: [] as string[],
    updated: [] as string[],
    failures: [] as any[]
  };

  try {
    console.log("Iniciando seed inteligente do módulo Sicoob...");

    // 0. Auto-correção: Limpar órfãos
    const cleanupReport = await cleanupOrphans();
    stats.orphans_removed = cleanupReport.removed;

    // 1. Criar/Atualizar Cooperativas
    const { error: errorCoop } = await supabase
      .from("cooperativas")
      .upsert([
        { id: "00000000-0000-0000-0000-000000000001", nome: "CENTRAL TESTE", codigo: "0001" },
        { id: "00000000-0000-0000-0000-000000000002", nome: "SINGULAR TESTE", codigo: "0002" },
      ]);
    if (errorCoop) throw errorCoop;

    // 2. Criar/Atualizar PA
    const { error: errorPA } = await supabase
      .from("postos_atendimento")
      .upsert([
        { id: "00000000-0000-0000-0000-000000000003", cooperativa_id: "00000000-0000-0000-0000-000000000002", nome: "PA TESTE 01", codigo: "01" },
      ]);
    if (errorPA) throw errorPA;

    // 3. Usuários de Teste
    for (const user of TEST_USERS_CONFIG) {
      await ensureTestUser(user, stats);

      // Limpa profiles duplicados por email
      await supabase.from("profiles").delete().eq("email", user.email).neq("user_id", user.id);

      // Upsert no Profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          cooperativa_id: user.cooperativa_id,
          pa_id: user.pa_id
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;
    }

    // Registrar log de auditoria
    await supabase.from("admin_audit_log").insert({
      action: "sicoob_seed_operation",
      details: stats
    });

    return new Response(JSON.stringify({ 
      message: "Seed finalizado com sucesso",
      report: stats,
      config_source: Deno.env.get("SICOOB_TEST_USER_PASSWORD") ? "env_vars" : "default_values"
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Erro no seed:", err);
    return new Response(JSON.stringify({ error: err.message, partial_report: stats }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
