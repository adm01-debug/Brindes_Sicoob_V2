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

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  // Pagina por listUsers para encontrar o usuário pelo email (admin SDK não tem getUserByEmail estável)
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id };
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureTestUser(user: (typeof TEST_USERS_CONFIG)[number]) {
  console.log(`Garantindo usuário de teste: ${user.email}`);

  // 1) Tenta atualizar pelo ID esperado
  const updateById = await supabase.auth.admin.updateUserById(user.id, {
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });

  if (!updateById.error) {
    console.log(`✓ Senha redefinida via ID para ${user.email}`);
    return;
  }

  console.warn(`updateUserById falhou para ${user.email}: ${updateById.error.message}. Buscando por email...`);

  // 2) Procura por email — se existe com outro ID, atualiza por esse ID
  const existing = await findUserByEmail(user.email);
  if (existing) {
    if (existing.id !== user.id) {
      console.warn(`⚠ ${user.email} existe com ID ${existing.id} (esperado ${user.id}). Atualizando ID real.`);
    }
    const { error: updateRealError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });
    if (updateRealError) throw updateRealError;
    // Sincroniza profile com o ID real do auth.users
    user.id = existing.id;
    console.log(`✓ Senha redefinida via email para ${user.email}`);
    return;
  }

  // 3) Não existe — cria com o ID esperado
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (createError) throw createError;
  if (created?.user?.id) user.id = created.user.id;
  console.log(`✓ Usuário ${user.email} criado`);
}

Deno.serve(async (req) => {
  try {
    console.log("Iniciando seed padronizado do módulo Sicoob...");

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
      await ensureTestUser(user);

      const { error: deleteProfileByEmailError } = await supabase
        .from("profiles")
        .delete()
        .eq("email", user.email)
        .neq("user_id", user.id);

      if (deleteProfileByEmailError) throw deleteProfileByEmailError;

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
        }, { 
          onConflict: 'user_id' 
        });

      if (profileError) throw profileError;
    }

    return new Response(JSON.stringify({ 
      message: "Seed finalizado com sucesso",
      config_source: Deno.env.get("SICOOB_TEST_USER_PASSWORD") ? "env_vars" : "default_values"
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Erro no seed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
