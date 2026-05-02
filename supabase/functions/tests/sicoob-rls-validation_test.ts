import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 2, true);

interface PolicyRow {
  polname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

async function getPolicies(table: string): Promise<PolicyRow[]> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject<PolicyRow>(`
      SELECT polname,
        CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END as cmd,
        pg_get_expr(polqual, polrelid) as qual,
        pg_get_expr(polwithcheck, polrelid) as with_check
      FROM pg_policy WHERE polrelid = ('public.' || '${table}')::regclass ORDER BY polname
    `);
    return r.rows;
  } finally { c.release(); }
}

async function isRlsEnabled(table: string): Promise<boolean> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject<{ relrowsecurity: boolean }>(`
      SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || '${table}')::regclass
    `);
    return r.rows[0]?.relrowsecurity ?? false;
  } finally { c.release(); }
}

// ============================================
// SICOOB: RLS enabled on Module tables
// ============================================
Deno.test({ name: "SICOOB: RLS enabled on all module tables", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const tables = ["cooperativas", "pa_budgets", "sicoob_orders", "sicoob_order_items", "sicoob_order_history"];
  for (const t of tables) {
    assertEquals(await isRlsEnabled(t), true, `RLS must be enabled on ${t}`);
  }
}});

// 1. COOPERATIVAS
Deno.test({ name: "SICOOB: cooperativas policies for new roles", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const p = await getPolicies("cooperativas");
  const allText = p.map(x => (x.qual ?? '') + ' ' + (x.with_check ?? '')).join(' ');
  
  // Admins/Supervisors should have access
  assert(allText.includes("is_admin") || allText.includes("has_role"), "Admin/Supervisor access check missing");
  
  // New roles check
  assert(allText.includes("gestor_compras") || allText.includes("gerente_pa") || allText.includes("vendedor"), "Sicoob roles (gestor_compras/gerente_pa/vendedor) missing in policies");
  
  // Isolation check: users should see their own coop
  assert(allText.includes("cooperativa_id") || allText.includes("id"), "Isolation by cooperativa_id/id missing");
}});

// 2. SICOOB_ORDERS
Deno.test({ name: "SICOOB: sicoob_orders RLS isolation", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const p = await getPolicies("sicoob_orders");
  const selectP = p.filter(x => x.cmd === 'SELECT' || x.cmd === 'ALL');
  
  // Vendedor can see orders from their PA
  // Gestor Compras can see orders from their Coop
  // Gerente PA can see orders from their PA
  const qualText = selectP.map(x => x.qual ?? '').join(' ');
  
  assert(qualText.includes("pa_id"), "Order selection should be filtered by pa_id for PA roles");
  assert(qualText.includes("cooperativa_id"), "Order selection should be filtered by cooperativa_id for coop roles");
  assert(qualText.includes("vendedor") || qualText.includes("gerente_pa") || qualText.includes("gestor_compras"), "Specific sicoob roles missing in orders policies");
}});

// 3. PA_BUDGETS
Deno.test({ name: "SICOOB: pa_budgets isolation", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const p = await getPolicies("pa_budgets");
  const allText = p.map(x => (x.qual ?? '') + ' ' + (x.with_check ?? '')).join(' ');
  
  assert(allText.includes("pa_id"), "PA Budget isolation by pa_id missing");
  assert(allText.includes("gerente_pa") || allText.includes("gestor_compras"), "Budget access for managers missing");
}});

// 4. ADMIN ACCESS (Regression Test)
Deno.test({ name: "SICOOB: Admin/Dev bypass on Sicoob tables", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const tables = ["cooperativas", "pa_budgets", "sicoob_orders"];
  for (const t of tables) {
    const p = await getPolicies(t);
    const hasAdminBypass = p.some(x => 
      (x.qual?.includes("is_admin") || x.qual?.includes("'dev'") || x.qual?.includes("'supervisor'")) ||
      (x.with_check?.includes("is_admin") || x.with_check?.includes("'dev'") || x.with_check?.includes("'supervisor'"))
    );
    assert(hasAdminBypass, `Table ${t} is missing admin/dev/supervisor bypass policy`);
  }
}});

Deno.test({ name: "CLEANUP", sanitizeOps: false, sanitizeResources: false, fn: async () => { await pool.end(); }});
