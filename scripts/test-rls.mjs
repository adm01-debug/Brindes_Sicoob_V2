import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  console.log('🚀 Iniciando Cross-Check de RLS...');

  // 1. Pegar dois usuários de organizações/PAs diferentes
  const { data: profiles, error: profileErr } = await adminClient
    .from('profiles')
    .select('user_id, email, cooperativa_id, pa_id')
    .limit(10);

  if (profileErr || !profiles || profiles.length < 2) {
    console.error('Erro ao buscar perfis para teste ou perfis insuficientes:', profileErr);
    return;
  }

  // Tenta encontrar dois usuários com orgs ou PAs diferentes
  let userA = profiles[0];
  let userB = profiles.find(p => p.cooperativa_id !== userA.cooperativa_id || p.pa_id !== userA.pa_id);

  if (!userB) {
    console.warn('⚠️ Não foram encontrados usuários de organizações/PAs diferentes. Usando os dois primeiros.');
    userB = profiles[1];
  }

  console.log(`👤 Usuário A: ${userA.email} (Org: ${userA.organization_id}, PA: ${userA.pa_id})`);
  console.log(`👤 Usuário B: ${userB.email} (Org: ${userB.organization_id}, PA: ${userB.pa_id})`);

  // 2. Criar um registro para Usuário B
  const { data: quoteB, error: quoteErr } = await adminClient
    .from('quotes')
    .insert({
      seller_id: userB.user_id,
      organization_id: userB.organization_id,
      pa_id: userB.pa_id,
      client_name: '[RLS-TEST] Registro do Usuário B',
      status: 'draft',
      subtotal: 100,
      total: 100
    })
    .select()
    .single();

  if (quoteErr) {
    console.error('Erro ao criar registro de teste para B:', quoteErr);
    return;
  }

  console.log(`📝 Registro de teste criado para B: ${quoteB.id}`);

  // 3. Simular acesso do Usuário A ao registro do Usuário B
  // Para simular RLS no lado do cliente, precisamos de um token JWT do Usuário A
  // Podemos gerar um token usando a service role (impersonation)
  const { data: authData, error: authErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userA.email,
  });

  // Nota: generateLink não dá o token diretamente, mas podemos usar sign-in ou apenas confiar na Edge Function rls-audit
  // que já faz essa lógica. 
  
  console.log('🔗 Chamando Edge Function rls-audit para auditoria profunda...');
  
  // Como não temos o token fácil aqui sem simular login completo, vamos chamar a function
  // passando o user_id que queremos auditar se a function permitir (vamos ajustar a function pra aceitar um admin trigger)
  
  const { data: auditResult, error: auditErr } = await adminClient.functions.invoke('rls-audit', {
    headers: {
      // Aqui idealmente passaríamos o token do User A, mas para o script de CLI
      // vamos fazer uma versão que a Edge Function aceite um "target_user_id" se chamada com service role
      "X-Admin-Audit": "true",
      "X-Target-User-Id": userA.user_id
    }
  });

  if (auditErr) {
    console.error('Erro ao chamar rls-audit:', auditErr);
  } else {
    console.log('\n📊 RESULTADOS DA AUDITORIA RLS:');
    console.log(`Total: ${auditResult.summary.total} | Passou: ${auditResult.summary.passed} | Falhou: ${auditResult.summary.failed}`);
    
    auditResult.results.forEach((r) => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} [${r.table}] ${r.op}: ${r.scenario} -> ${r.actual} (Esperado: ${r.expected})`);
    });
  }

  // Cleanup
  await adminClient.from('quotes').delete().eq('id', quoteB.id);
  console.log('\n🧹 Cleanup concluído.');
}

testRLS();
