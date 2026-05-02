import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    console.log("Iniciando seed do módulo Sicoob...");

    // 1. Criar Cooperativas
    const { error: errorCoop } = await supabase
      .from("cooperativas")
      .upsert([
        { id: "00000000-0000-0000-0000-000000000001", nome: "CENTRAL TESTE", codigo: "0001" },
        { id: "00000000-0000-0000-0000-000000000002", nome: "SINGULAR TESTE", codigo: "0002" },
      ]);

    if (errorCoop) throw errorCoop;

    // 2. Criar PA
    const { error: errorPA } = await supabase
      .from("postos_atendimento")
      .upsert([
        { id: "00000000-0000-0000-0000-000000000003", cooperativa_id: "00000000-0000-0000-0000-000000000002", nome: "PA TESTE 01", codigo: "01" },
      ]);

    if (errorPA) throw errorPA;

    // 3. Usuários de Teste (Auth e Profile)
    const testUsers = [
      {
        id: "00000000-0000-0000-0000-000000000004",
        email: "pa@teste.com",
        full_name: "Usuário PA Teste",
        role: "sicoob_pa",
        cooperativa_id: "00000000-0000-0000-0000-000000000002",
        pa_id: "00000000-0000-0000-0000-000000000003"
      },
      {
        id: "00000000-0000-0000-0000-000000000005",
        email: "singular@teste.com",
        full_name: "Usuário Singular Teste",
        role: "sicoob_singular",
        cooperativa_id: "00000000-0000-0000-0000-000000000002",
        pa_id: null
      },
      {
        id: "00000000-0000-0000-0000-000000000006",
        email: "central@teste.com",
        full_name: "Usuário Central Teste",
        role: "sicoob_central",
        cooperativa_id: "00000000-0000-0000-0000-000000000001",
        pa_id: null
      },
      {
        id: "00000000-0000-0000-0000-000000000007",
        email: "gestor@teste.com",
        full_name: "Usuário Gestor Teste",
        role: "sicoob_gestor",
        cooperativa_id: null,
        pa_id: null
      }
    ];

    for (const user of testUsers) {
      // Criar no Auth se não existir (usando admin API para forçar senha e confirmação)
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: "password123",
        email_confirm: true,
        user_metadata: { full_name: user.full_name }
      });

      if (authError && authError.message !== "User already registered") {
         console.warn(`Erro ao criar user auth ${user.email}:`, authError.message);
      }

      // Upsert no Profile usando user_id como critério de conflito
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

    return new Response(JSON.stringify({ message: "Seed finalizado com sucesso" }), {
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
