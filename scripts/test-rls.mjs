#!/usr/bin/env node
/**
 * test-rls.mjs
 * ----------------------------------------------------------------
 * Gate de CI: cross-check de RLS. Cria um registro para o usuário B,
 * chama a Edge Function `rls-audit` simulando acesso do usuário A e
 * valida que o RLS bloqueia o acesso cross-tenant.
 *
 * Saída:
 *  - exit 0 → auditoria passou.
 *  - exit 1 → falha de RLS ou erro de execução.
 *  - exit 2 → erro de configuração.
 */
import { createClient } from '@supabase/supabase-js';

const isCI = process.env.CI === "true" || process.env.CI === "1";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(2);
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
    console.error('❌ Erro ao buscar perfis para teste ou perfis insuficientes:', profileErr?.message || profileErr);
    process.exit(1);
  }

  // Tenta encontrar dois usuários com orgs ou PAs diferentes
  let userA = profiles[0];
  let userB = profiles.find(p => p.cooperativa_id !== userA.cooperativa_id || p.pa_id !== userA.pa_id);

  if (!userB) {
    console.warn('⚠️ Não foram encontrados usuários de organizações/PAs diferentes. Usando os dois primeiros.');
    userB = profiles[1];
  }

  console.log(`👤 Usuário A: ${userA.email} (Coop: ${userA.cooperativa_id}, PA: ${userA.pa_id})`);
  console.log(`👤 Usuário B: ${userB.email} (Coop: ${userB.cooperativa_id}, PA: ${userB.pa_id})`);

  // 2. Criar um registro para Usuário B
  const { data: quoteB, error: quoteErr } = await adminClient
    .from('quotes')
    .insert({
      seller_id: userB.user_id,
      singular_id: userB.cooperativa_id,
      pa_id: userB.pa_id,
      client_name: '[RLS-TEST] Registro do Usuário B',
      status: 'draft',
      subtotal: 100,
      total: 100
    })
    .select()
    .single();

  if (quoteErr) {
    console.error('❌ Erro ao criar registro de teste para B:', quoteErr.message);
    process.exit(1);
  }

  console.log(`📝 Registro de teste criado para B: ${quoteB.id}`);

  // 3. Simular acesso do Usuário A ao registro do Usuário B.
  console.log('🔗 Chamando Edge Function rls-audit para auditoria profunda...');

  const { data: auditResult, error: auditErr } = await adminClient.functions.invoke('rls-audit', {
    headers: {
      "X-Admin-Audit": "true",
      "X-Target-User-Id": userA.user_id
    }
  });

  if (auditErr) {
    console.error('❌ Erro ao chamar rls-audit:', auditErr.message);
    process.exit(1);
  }

  console.log('\n📊 RESULTADOS DA AUDITORIA RLS:');
  console.log(`Total: ${auditResult.summary.total} | Passou: ${auditResult.summary.passed} | Falhou: ${auditResult.summary.failed}`);

  auditResult.results.forEach((r) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.table}] ${r.op}: ${r.scenario} -> ${r.actual} (Esperado: ${r.expected})`);
    if (!r.passed && isCI) {
      console.log(`::error file=test-rls.mjs,title=RLS falhou::[${r.table}] ${r.op}: ${r.scenario}`);
    }
  });

  // Cleanup
  await adminClient.from('quotes').delete().eq('id', quoteB.id);
  console.log('\n🧹 Cleanup concluído.');

  if (auditResult.summary.failed > 0) {
    console.error(`\n❌ ${auditResult.summary.failed} cenário(s) de RLS falharam.`);
    process.exit(1);
  }
  console.log('\n✅ Todos os cenários de RLS passaram.');
  process.exit(0);
}

testRLS().catch((error) => {
  console.error('❌ Falha inesperada no gate: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(2);
});