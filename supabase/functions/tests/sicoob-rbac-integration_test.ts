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
      // 1. Verify that 'order_payments' has RLS that restricts non-supervisors
      const policies = await c.queryObject<{ polname: string, qual: string }>(`
        SELECT polname, pg_get_expr(polqual, polrelid) as qual
        FROM pg_policy
        WHERE polrelid = 'public.order_payments'::regclass
      `);
      
      const hasSupervisorPolicy = policies.rows.some(p => 
        p.qual.includes("has_role") && (p.qual.includes("supervisor") || p.qual.includes("admin"))
      );
      
      assert(hasSupervisorPolicy, "Table 'order_payments' must have RBAC policies for supervisors/admins");

      // 2. Verify that 'order_pilot_approvals' has RLS
      const approvalPolicies = await c.queryObject<{ polname: string, qual: string }>(`
        SELECT polname, pg_get_expr(polqual, polrelid) as qual
        FROM pg_policy
        WHERE polrelid = 'public.order_pilot_approvals'::regclass
      `);
      
      assert(approvalPolicies.rows.length > 0, "Table 'order_pilot_approvals' must have RLS enabled and policies defined");

    } finally {
      c.release();
    }
  }
});
