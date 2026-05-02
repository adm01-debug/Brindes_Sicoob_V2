import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // 3. Validar RLS (Básico)
    const { data: rlsStatus } = await admin.rpc('check_rls_enabled', { table_names: tables });

    // 4. Testar Edge Function 'manage-users' (se aceita novos roles)
    // Nota: Apenas verificamos se o schema/logic permite sem disparar 500
    
    return new Response(JSON.stringify({
      migration_applied: hasSicoobRoles && tableChecks.every(c => c.exists),
      details: {
        roles: enumValues,
        tables: tableChecks,
        rls: rlsStatus
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
