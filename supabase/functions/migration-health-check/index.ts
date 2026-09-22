import { authorize } from "../_shared/authorize.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { evaluateMigrationHealth } from "./contract.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" };
  try {
    const auth = await authorize(req, { requireRole: "dev" });
    if (!auth.ok) return auth.response;
    const admin = auth.supabaseAdmin;
    const tables = ['cooperativas', 'postos_atendimento', 'cooperativa_budgets', 'pa_budgets'];
    const [roles, rls, tableChecks] = await Promise.all([
      admin.rpc('get_enum_values', { enum_name: 'app_role' }),
      admin.rpc('check_rls_enabled', { table_names: tables }),
      Promise.all(tables.map(async table => {
        const { error } = await admin.from(table).select('id').limit(0);
        return { table, exists: !error, error_code: error?.code ?? null };
      })),
    ]);
    const migrationApplied = evaluateMigrationHealth(roles, tableChecks, rls);
    return new Response(JSON.stringify({
      migration_applied: migrationApplied,
      details: { roles: roles.data, tables: tableChecks, rls: rls.data,
        error_codes: [roles.error?.code, rls.error?.code].filter(Boolean) },
    }), { status: migrationApplied ? 200 : 503, headers });
  } catch {
    return new Response(JSON.stringify({ migration_applied: false, error: 'verificacao_indisponivel' }), { status: 503, headers });
  }
});
