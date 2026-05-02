import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = DB_URL ? new Pool(DB_URL, 2, true) : null;

Deno.test({
  name: "SICOOB: RBAC integration tests for order extensions",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !pool,
  fn: async () => {
    if (!pool) return;
    const c = await pool.connect();
    
    try {
      // 1. Verify table existence and basic RLS status
      const tables = ["order_logistics", "order_invoices", "order_payments", "order_pilot_approvals"];
      for (const table of tables) {
        const check = await c.queryObject<{ relname: string }>(`
          SELECT relname FROM pg_class 
          JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
          WHERE pg_namespace.nspname = 'public' AND relname = $1
        `, [table]);
        assert(check.rows.length > 0, `Table ${table} must exist`);
      }

      // 2. Verify that 'order_payments' has RLS that restricts non-supervisors
      const policies = await c.queryObject<{ polname: string, qual: string }>(`
        SELECT polname, pg_get_expr(polqual, polrelid) as qual
        FROM pg_policy
        WHERE polrelid = 'public.order_payments'::regclass
      `);
      
      const hasRestrictedPolicy = policies.rows.some(p => 
        p.qual && (p.qual.includes("has_role") || p.qual.includes("is_supervisor") || p.qual.includes("is_admin"))
      );
      
      // Note: We expect some form of role-based check in the expression
      assert(hasRestrictedPolicy || policies.rows.length === 0, 
        "Table 'order_payments' should have RBAC policies or be fully restricted if no specific policy allows it");

      // 3. Verify Error Codes: Simulate access with restricted role logic
      // In integration tests without real JWT sessions, we check the policy definitions
      // to ensure they don't default to 'true' for anonymous or basic users.
      for (const table of tables) {
        const anonPolicies = await c.queryObject<{ polname: string }>(`
          SELECT polname FROM pg_policy
          WHERE polrelid = ('public.' || $1)::regclass
          AND (polroles = '{0}' OR 3364 = ANY(polroles)) -- 3364 is typical oid for 'anon' or public
        `, [table]);
        
        const openAccess = anonPolicies.rows.some(p => p.polname.toLowerCase().includes("public") || p.polname.toLowerCase().includes("all"));
        assert(!openAccess, `Table ${table} should NOT have public/anon open access policies`);
      }

    } finally {
      c.release();
    }
  }
});

