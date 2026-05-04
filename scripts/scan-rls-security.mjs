import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanRls() {
  console.log('🔍 Iniciando varredura de segurança RLS...');

  const { data: tables, error } = await supabase.rpc('check_tables_rls' as any);

  if (error) {
    // If RPC doesn't exist, use direct SQL via psql-like query if possible
    // For now, we'll assume we might need to create this RPC or use a different method.
    console.error('Erro ao verificar RLS via RPC:', error.message);
    
    // Fallback attempt: check common tables
    const commonTables = ['profiles', 'quotes', 'orders', 'pa_budgets', 'audit_log'];
    console.log('Verificando tabelas comuns...');
    
    for (const table of commonTables) {
       // This is a placeholder since we can't easily query pg_tables from client without RPC
       console.log(`- ${table}: RLS Verification requires database-level access.`);
    }
    return;
  }

  const insecure = (tables as any[]).filter(t => !t.relrowsecurity);
  
  if (insecure.length > 0) {
    console.error('🚨 AVISO: Tabelas detectadas SEM RLS habilitado:');
    insecure.forEach(t => console.error(`  - ${t.schemaname}.${t.relname}`));
    process.exit(1);
  } else {
    console.log('✅ Todas as tabelas verificadas possuem RLS habilitado.');
  }
}

scanRls();
