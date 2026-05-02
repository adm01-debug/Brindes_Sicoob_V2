import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 2, true);

/**
 * Valida que o banco de dados impede valores inválidos em Budgets e Pedidos
 */
Deno.test({
  name: "SICOOB: Validation constraints for budgets and orders",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const c = await pool.connect();
    
    try {
      // 1. Testar Budget Negativo (verba_total)
      try {
        await c.queryObject(`
          INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_consumida, limite_alcada)
          VALUES ('00000000-0000-0000-0000-000000000000', 2024, 5, -100, 0, 0)
        `);
        assert(false, "Banco permitiu inserção de verba_total negativa");
      } catch (e: any) {
        console.log("Bloqueio de verba_total negativa (OK):", e.message);
        assert(e.message.includes("check") || e.message.includes("violates"), "Constraint de budget negativo não disparada");
      }

      // 2. Testar Valor de Pedido Negativo
      try {
        await c.queryObject(`
          INSERT INTO public.sicoob_orders (pa_id, cooperative_id, created_by, total_amount, status)
          VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), -50, 'draft')
        `);
        assert(false, "Banco permitiu inserção de total_amount negativo");
      } catch (e: any) {
        console.log("Bloqueio de total_amount negativo (OK):", e.message);
        assert(e.message.includes("check_positive_total"), "Constraint check_positive_total não disparada");
      }

      // 3. Testar Quantidade de Item Inválida
      try {
        await c.queryObject(`
          INSERT INTO public.sicoob_order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES (gen_random_uuid(), gen_random_uuid(), 'Test', 0, 10, 0)
        `);
        assert(false, "Banco permitiu inserção de quantidade zero");
      } catch (e: any) {
        console.log("Bloqueio de quantidade zero (OK):", e.message);
        assert(e.message.includes("check_positive_quantity"), "Constraint check_positive_quantity não disparada");
      }

    } finally {
      c.release();
    }
  }
});

Deno.test({ name: "CLEANUP", sanitizeOps: false, sanitizeResources: false, fn: async () => { await pool.end(); }});
