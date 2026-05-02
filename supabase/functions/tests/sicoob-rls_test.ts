import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// IDs fixos definidos no sicoob-seed
const ID_CENTRAL = "00000000-0000-0000-0000-000000000001";
const ID_SINGULAR = "00000000-0000-0000-0000-000000000002";
const ID_PA = "00000000-0000-0000-0000-000000000003";

const USERS = {
  PA: { id: "00000000-0000-0000-0000-000000000004" },
  CENTRAL: { id: "00000000-0000-0000-0000-000000000006" }
};

Deno.test({
  name: "RLS: Simulação de filtros por nível de acesso",
  async fn() {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
    
    try {
      // 1. Criar um pedido para o PA
      const { data: orderPA, error: err1 } = await supabase
        .from("sicoob_orders")
        .insert({
          pa_id: ID_PA,
          cooperative_id: ID_SINGULAR,
          total_amount: 100,
          created_by: USERS.PA.id
        })
        .select()
        .single();

      if (err1) throw err1;

      // 2. Criar um pedido de OUTRA cooperativa
      const { data: orderOther, error: err2 } = await supabase
        .from("sicoob_orders")
        .insert({
          pa_id: null,
          cooperative_id: ID_CENTRAL,
          total_amount: 50,
          created_by: USERS.CENTRAL.id
        })
        .select()
        .single();

      if (err2) throw err2;

      // 3. Simular query que um PA faria
      const { data: paVisible } = await supabase
        .from("sicoob_orders")
        .select("*")
        .eq("pa_id", ID_PA);

      assert(paVisible?.find(o => o.id === orderPA.id), "PA deve ver seu pedido");
      assert(!paVisible?.find(o => o.id === orderOther.id), "PA não deve ver outros pedidos");

      // 4. Simular query que uma SINGULAR faria
      const { data: singularVisible } = await supabase
        .from("sicoob_orders")
        .select("*")
        .eq("cooperative_id", ID_SINGULAR);

      assert(singularVisible?.find(o => o.id === orderPA.id), "Singular deve ver pedidos de seus PAs");

    } finally {
      // Cleanup de teste (opcional, mas bom para manter limpo)
    }
  },
  sanitizeResources: false,
  sanitizeOps: false
});
