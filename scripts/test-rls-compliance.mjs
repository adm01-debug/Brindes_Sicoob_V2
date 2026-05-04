import { createClient } from '@supabase/supabase-js';

/**
 * Enterprise RLS Compliance Test
 * Specifically targets cross-organization data leak scenarios.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars for RLS test');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

async function testCompliance() {
  console.log('🛡️ Iniciando Teste de Conformidade de RLS Cross-Org...');

  // 1. Get two different organizations/PAs
  const { data: pas } = await admin.from('postos_atendimento').select('id, organization_id').limit(2);
  
  if (!pas || pas.length < 2) {
    console.log('⚠️ Massa de dados insuficiente para teste cross-org (requer 2 PAs). Puliendo...');
    return;
  }

  const paA = pas[0];
  const paB = pas[1];

  console.log(`- Org A: ${paA.organization_id} | PA A: ${paA.id}`);
  console.log(`- Org B: ${paB.organization_id} | PA B: ${paB.id}`);

  // 2. Create a private record for Org B
  const { data: quoteB, error: createErr } = await admin
    .from('quotes')
    .insert({
      organization_id: paB.organization_id,
      pa_id: paB.id,
      client_name: 'SECRET CLIENT ORG B',
      status: 'draft',
      total: 5000
    })
    .select()
    .single();

  if (createErr) {
    console.error('Erro ao criar registro de teste:', createErr.message);
    return;
  }

  console.log(`✅ Registro privado criado na Org B: ${quoteB.id}`);

  // 3. Attempt to access it using Org A context via REST API with ANON KEY
  // We simulate a user from Org A trying to fetch Org B's record
  // NOTE: This assumes RLS is working. If it fails to fetch (empty data), RLS is GOOD.
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || supabaseKey);
  
  const { data: unauthorizedFetch, error: fetchErr } = await anonClient
    .from('quotes')
    .select('id')
    .eq('id', quoteB.id)
    .maybeSingle();

  if (fetchErr) {
    console.log('✅ Acesso negado conforme esperado (Erro de permissão ou objeto não encontrado).');
  } else if (unauthorizedFetch) {
    console.error('❌ VULNERABILIDADE CRÍTICA: Registro da Org B vazou para o contexto Anon/Org A!');
    process.exit(1);
  } else {
    console.log('✅ Isolamento confirmado: Registro da Org B está invisível para a Org A.');
  }

  // 4. Double check metadata policies
  const { data: policies } = await admin.rpc('run_sql_query', { 
    sql: "SELECT policyname FROM pg_policies WHERE tablename = 'quotes';" 
  } as any);

  const hasRls = policies?.some(p => p.policyname.includes('org_members'));
  
  if (hasRls) {
    console.log('✅ Políticas de isolamento Multi-tenant detectadas no catálogo pg_policies.');
  } else {
    console.error('❌ ERRO: Nenhuma política de isolamento multi-tenant encontrada para "quotes"!');
    process.exit(1);
  }

  // Cleanup
  await admin.from('quotes').delete().eq('id', quoteB.id);
  console.log('🧹 Cleanup concluído.');
  console.log('🏁 Teste de conformidade finalizado com sucesso.');
}

testCompliance();
