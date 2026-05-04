import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "migration-health-check", requestId, req });
  log.info("health_check_start");

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // 1. Validar Enums
    const { data: enumValues } = await admin.rpc('get_enum_values', { enum_name: 'app_role' });
    const hasSicoobRoles = ['gestor_compras', 'gerente_pa'].every(r => enumValues?.includes(r));

    // 2. Validar Estrutura de Tabelas
    const tables = ['cooperativas', 'postos_atendimento', 'cooperativa_budgets', 'pa_budgets'];
    const tableChecks = await Promise.all(tables.map(async (t) => {
      const { error } = await admin.from(t).select('id').limit(1);
      return { table: t, exists: !error || error.code !== '42P01' };
    }));

    // 3. Validar RLS
    const { data: rlsStatus } = await admin.rpc('check_rls_enabled', { table_names: tables });

    const isApplied = hasSicoobRoles && tableChecks.every(c => c.exists);
    log.info("health_check_ok", { is_applied: isApplied });

    return log.respond(new Response(JSON.stringify({
      migration_applied: isApplied,
      details: {
        roles: enumValues,
        tables: tableChecks,
        rls: rlsStatus
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } }));

  } catch (e) {
    log.error("health_check_failed", { err: e.message });
    return log.respond(new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }));
  }
});