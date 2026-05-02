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

async function ensureTestUser(user: (typeof TEST_USERS_CONFIG)[number]) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw listError;

  const existingById = listed.users.find((candidate) => candidate.id === user.id);
  const existingByEmail = listed.users.find((candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase());

  if (existingByEmail && existingByEmail.id !== user.id) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(existingByEmail.id);
    if (deleteAuthError) throw deleteAuthError;

    const { error: deleteProfileByEmailError } = await supabase
      .from("profiles")
      .delete()
      .eq("email", user.email)
      .neq("user_id", user.id);

    if (deleteProfileByEmailError) throw deleteProfileByEmailError;
  }

  if (existingById || existingByEmail?.id === user.id) {
    console.log(`Atualizando senha do usuário de teste existente: ${user.email}`);
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });

    if (updateUserError) throw updateUserError;
    return;
  }

  console.log(`Criando usuário de teste: ${user.email}`);
  const { error: createUserError } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });

  if (createUserError) throw createUserError;
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
