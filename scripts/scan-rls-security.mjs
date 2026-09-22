import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function scanRls() {
  const [{ data: tables, error: tableError }, { data: emptyPolicies, error: policyError }] = await Promise.all([
    supabase.rpc('check_tables_rls'),
    supabase.rpc('audit_empty_rls_policies'),
  ]);
  if (tableError) throw new Error(`check_tables_rls falhou: ${tableError.message}`);
  if (policyError) throw new Error(`audit_empty_rls_policies falhou: ${policyError.message}`);
  if (!Array.isArray(tables) || tables.length === 0) throw new Error('A auditoria RLS não retornou tabelas públicas');
  if (!Array.isArray(emptyPolicies)) throw new Error('A auditoria de policies retornou contrato inválido');

  const insecure = tables.filter((table) => table.relrowsecurity !== true);
  if (insecure.length || emptyPolicies.length) {
    const noRls = insecure.map((table) => `${table.schemaname}.${table.relname}`);
    const noPolicy = emptyPolicies.map((table) => `public.${table.table_name}`);
    throw new Error(`RLS inválido. Sem RLS: ${noRls.join(', ') || 'nenhuma'}. Sem policy: ${noPolicy.join(', ') || 'nenhuma'}.`);
  }
  console.log(`${tables.length} tabelas públicas verificadas; nenhuma sem RLS ou sem policy.`);
}

scanRls().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
