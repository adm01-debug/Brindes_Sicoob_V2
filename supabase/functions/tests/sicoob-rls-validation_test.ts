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
  const allText = p.map(x => (x.qual ?? '') + ' ' + (x.with_check ?? '')).join(' ').toLowerCase();
  
  // Admins/Supervisors should have access
  assert(allText.includes("admin") || allText.includes("has_role"), "Admin/Supervisor access check missing");
  
  // New roles check - gestor_compras is explicitly handled in cooperativas_gestor_update
  assert(allText.includes("gestor_compras") || allText.includes("is_gestor_compras"), "Sicoob role gestor_compras missing in policies");
  
  // Isolation check: users should see their own coop or admin bypass
  assert(allText.includes("cooperativa_id") || allText.includes("id =") || allText.includes("has_role"), "Isolation or bypass missing");
}});

// 2. SICOOB_ORDERS
Deno.test({ name: "SICOOB: sicoob_orders RLS isolation", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const p = await getPolicies("sicoob_orders");
  const selectP = p.filter(x => x.cmd === 'SELECT' || x.cmd === 'ALL');
  
  const qualText = selectP.map(x => x.qual ?? '').join(' ').toLowerCase();
  
  // Note: the policies currently use "profiles.id = auth.uid()" and specific column names
  assert(qualText.includes("pa_id"), "Order selection should be filtered by pa_id for PA roles");
  assert(qualText.includes("cooperativa_id") || qualText.includes("cooperative_id"), "Order selection should be filtered by cooperative_id/cooperativa_id");
  
  // The policies have descriptive names like "Gerentes can view...", "Vendedores can manage..."
  const polNames = p.map(x => x.polname.toLowerCase()).join(' ');
  assert(polNames.includes("vendedores") || polNames.includes("gerentes") || polNames.includes("gestores"), "Descriptive sicoob role policies missing in orders");
}});

// 3. PA_BUDGETS
Deno.test({ name: "SICOOB: pa_budgets isolation", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const p = await getPolicies("pa_budgets");
  const allText = p.map(x => (x.qual ?? '') + ' ' + (x.with_check ?? '')).join(' ').toLowerCase();
  
  assert(allText.includes("pa_id"), "PA Budget isolation by pa_id missing");
  // Check for some form of manager/admin role access
  assert(allText.includes("gerente") || allText.includes("gestor") || allText.includes("admin"), "Manager/Admin access missing in budgets");
}});

// 4. ADMIN ACCESS (Regression Test)
Deno.test({ name: "SICOOB: Admin/Dev bypass on Sicoob tables", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const tables = ["cooperativas", "pa_budgets", "sicoob_orders"];
  for (const t of tables) {
    const p = await getPolicies(t);
    const polText = p.map(x => (x.qual ?? '') + ' ' + (x.polname ?? '') + ' ' + (x.with_check ?? '')).join(' ').toLowerCase();
    
    const hasAdminBypass = 
      polText.includes("admin") || 
      polText.includes("has_role") || 
      polText.includes("dev") || 
      polText.includes("supervisor");
      
    assert(hasAdminBypass, `Table ${t} is missing admin/dev/supervisor bypass policy (Found: ${polText})`);
  }
}});

Deno.test({ name: "CLEANUP", sanitizeOps: false, sanitizeResources: false, fn: async () => { await pool.end(); }});
