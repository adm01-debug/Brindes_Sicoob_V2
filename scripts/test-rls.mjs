#!/usr/bin/env node
/**
 * test-rls.mjs
 * ----------------------------------------------------------------
 * Cross-check de RLS. Cria um registro para o usuário B (INSERT/DELETE em `quotes` com
 * service_role), chama a Edge Function `rls-audit` simulando acesso do usuário A e valida que
 * o RLS bloqueia o acesso cross-tenant.
 *
 * DESTINO: só o projeto de homologação. Usa as variáveis `E2E_*` e `validateE2ETarget`
 * (scripts/e2e-target.mjs), que recusa o projeto oficial, o catálogo, o CRM e os legados. A
 * versão anterior lia `SUPABASE_URL` + service_role e escrevia em qualquer projeto, inclusive
 * produção.
 *
 * Só dá "passou" com prova: pelo menos 2 usuários de cooperativa/PA diferentes e pelo menos
 * 1 cenário executado (total 0 antes virava "todos passaram").
 *
 * Saída:
 *  - exit 0 → auditoria passou.
 *  - exit 1 → falha de RLS ou erro de execução.
 *  - exit 2 → erro de configuração.
 */
import { createClient } from '@supabase/supabase-js';
import { validateE2ETarget } from './e2e-target.mjs';

const isCI = process.env.CI === "true" || process.env.CI === "1";

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

try {
  validateE2ETarget({
    url: supabaseUrl,
    projectId: process.env.E2E_SUPABASE_PROJECT_ID,
    allowedProjectId: process.env.E2E_ALLOWED_PROJECT_ID,
    publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: supabaseKey,
  });
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(err.message === 'Configuração obrigatória do destino E2E ausente.' ? 2 : 1);
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
    // Com os dois no mesmo tenant não há isolamento a provar: passar aqui seria falso verde.
    console.error('❌ Não há usuários de cooperativas/PAs diferentes no destino de homologação; o cross-tenant não pode ser provado.');
    process.exit(1);
  }

  console.log(`👤 Usuário A: ${userA.email} (Coop: ${userA.cooperativa_id}, PA: ${userA.pa_id})`);
  console.log(`👤 Usuário B: ${userB.email} (Coop: ${userB.cooperativa_id}, PA: ${userB.pa_id})`);

  // 2. Criar um registro para Usuário B.
  // Cleanup em `finally` garante a remoção do registro de teste mesmo em
  // falha (erro de auditoria ou cenário RLS reprovado) — evita órfão [RLS-TEST].
  let quoteId = null;
  let exitCode = 0;
  try {
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

    quoteId = quoteB.id;
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
      throw new Error(`Erro ao chamar rls-audit: ${auditErr.message}`);
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

    if (!(auditResult.summary.total > 0)) {
      throw new Error('A auditoria rls-audit não executou nenhum cenário (total 0); nada foi provado.');
    }
    if (auditResult.summary.failed > 0) {
      throw new Error(`${auditResult.summary.failed} cenário(s) de RLS falharam.`);
    }
    console.log('\n✅ Todos os cenários de RLS passaram.');
  } catch (error) {
    exitCode = 1;
    console.error('❌ ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    // Cleanup sempre executado, inclusive em caminho de erro.
    if (quoteId) {
      const { error: delErr } = await adminClient.from('quotes').delete().eq('id', quoteId);
      if (delErr) {
        console.error('⚠️ Cleanup do registro de teste falhou:', delErr.message);
      } else {
        console.log('\n🧹 Cleanup concluído.');
      }
    }
  }

  process.exit(exitCode);
}

testRLS().catch((error) => {
  console.error('❌ Falha inesperada no gate: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(2);
});