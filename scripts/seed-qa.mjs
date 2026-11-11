/**
 * seed-qa.mjs — popula dados de QA chamando a edge `sicoob-seed-qa`.
 *
 * DESTINO: só o projeto de homologação. A edge faz upsert em `cooperativas`/`pa_budgets` e troca
 * a senha dos usuários QA; por isso o destino passa por `validateE2ETarget`
 * (scripts/e2e-target.mjs), que recusa o projeto oficial, o catálogo, o CRM e os legados. A versão
 * anterior lia `VITE_SUPABASE_URL` (o nome canônico de produção) sem guarda.
 *
 * A edge exige papel `dev` (`authorize(..., { requireRole: "dev" })`): o script entra com
 * `E2E_DEV_EMAIL` / `E2E_DEV_PASSWORD` antes de invocar (só com a chave anon a chamada era
 * sempre 401). Contas dev com MFA obrigatório não são cobertas aqui.
 *
 * Uso: node scripts/seed-qa.mjs [cenário]
 * Exit: 0 = seed concluído · 1 = falha · 2 = configuração ausente.
 */
import { createClient } from '@supabase/supabase-js';
import { validateE2ETarget } from './e2e-target.mjs';

const url = process.env.E2E_SUPABASE_URL;
const publishableKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const devEmail = process.env.E2E_DEV_EMAIL;
const devPassword = process.env.E2E_DEV_PASSWORD;

try {
  validateE2ETarget({
    url,
    projectId: process.env.E2E_SUPABASE_PROJECT_ID,
    allowedProjectId: process.env.E2E_ALLOWED_PROJECT_ID,
    publishableKey,
    serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  });
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(err.message === 'Configuração obrigatória do destino E2E ausente.' ? 2 : 1);
}

if (!devEmail || !devPassword) {
  console.error('❌ E2E_DEV_EMAIL e E2E_DEV_PASSWORD são obrigatórios (a edge sicoob-seed-qa exige papel dev).');
  process.exit(2);
}

const supabase = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function runSeed() {
  const scenario = process.argv[2] || 'default';

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });
  if (signInError) {
    console.error(`❌ Login do usuário dev de QA falhou: ${signInError.message}`);
    process.exit(1);
  }

  console.log(`Iniciando seed QA para o cenário: ${scenario}...`);
  const { data, error } = await supabase.functions.invoke('sicoob-seed-qa', {
    body: { scenario }
  });

  if (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  }

  console.log('Seed finalizado com sucesso!');
  console.log(JSON.stringify(data, null, 2));
}

runSeed().catch((error) => {
  console.error(`❌ Falha inesperada no seed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
