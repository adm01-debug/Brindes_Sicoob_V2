import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 2, true);


interface PolicyRow {
  polname: string;
  cmd: string;
  qual: string | null;
  roles: string[];
}

async function getPolicies(table: string): Promise<PolicyRow[]> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject<PolicyRow>(`
      SELECT polname,
        CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END as cmd,
        pg_get_expr(polqual, polrelid) as qual,
        (SELECT array_agg(rolname::text) FROM pg_roles WHERE oid = ANY(polroles)) as roles
      FROM pg_policy WHERE polrelid = ('public.' || $1)::regclass ORDER BY polname
    `, [table]);
    return r.rows;
  } finally { c.release(); }
}

/**
 * Valida que cada role operacional tem isolamento de RLS (pa_id ou cooperativa_id)
 * e que admins têm bypass (has_role('admin')).
 */
Deno.test({
  name: "SICOOB: RLS policy verification across roles",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const TABLES_TO_VALIDATE = ['sicoob_orders', 'pa_budgets', 'sicoob_order_items'];
    
    for (const table of TABLES_TO_VALIDATE) {
      const policies = await getPolicies(table);
      const allQuals = policies.map(p => p.qual?.toLowerCase() || '').join(' ');
      const allNames = policies.map(p => p.polname.toLowerCase()).join(' ');

      // 1. Validar Isolamento para Vendedor (current_user_pa_id ou created_by)
      const hasSellerIsolation = allQuals.includes('pa_id') || allQuals.includes('created_by');
      assert(hasSellerIsolation, `Tabela ${table} não possui isolamento RLS visível para Vendedores.`);

      // 2. Validar Isolamento para Gerente PA (current_user_pa_id)
      const hasManagerIsolation = allQuals.includes('pa_id');
      assert(hasManagerIsolation, `Tabela ${table} não possui isolamento RLS visível para Gerentes de PA.`);

      // 3. Validar Isolamento para Gestor Cooperativa (cooperativa_id)
      const hasCoopIsolation = allQuals.includes('cooperativa_id') || allQuals.includes('cooperative_id') || allQuals.includes('current_user_cooperativa_id');
      assert(hasCoopIsolation, `Tabela ${table} não possui isolamento RLS visível para Gestores de Cooperativa.`);

      // 4. Validar Bypass de Admin
      const hasAdminBypass = allQuals.includes('admin') || allQuals.includes('has_role') || allNames.includes('admin');
      assert(hasAdminBypass, `Tabela ${table} não possui política de bypass/acesso total para Administradores.`);
    }
  }
});

Deno.test({ name: "CLEANUP", sanitizeOps: false, sanitizeResources: false, fn: async () => { await pool.end(); }});
