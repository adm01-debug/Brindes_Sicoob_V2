import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import { validateE2ESupabaseTarget } from '../../scripts/qa/validate-e2e-supabase-target.mjs';

const projectId = 'abcdefghijklmnopqrst';
const isolatedUrl = `https://${projectId}.supabase.co`;
const isolatedPublishableKey = 'publishable-test-key';

test('aceita apenas URL e identificador do mesmo projeto Supabase isolado', () => {
  assert.deepEqual(validateE2ESupabaseTarget({
    url: isolatedUrl,
    projectId,
    publishableKey: isolatedPublishableKey,
  }), { ok: true });
});

test('falha fechado quando falta configuração, há divergência ou o destino é canônico', () => {
  assert.equal(validateE2ESupabaseTarget({ url: '', projectId, publishableKey: isolatedPublishableKey }).ok, false);
  assert.equal(validateE2ESupabaseTarget({ url: isolatedUrl, projectId: 'zyxwvutsrqponmlkjihg', publishableKey: isolatedPublishableKey }).reason,
    'URL e identificador do projeto não correspondem');
  assert.equal(validateE2ESupabaseTarget({ url: 'http://abcdefghijklmnopqrst.supabase.co', projectId, publishableKey: isolatedPublishableKey }).ok, false);
  assert.equal(validateE2ESupabaseTarget({ url: 'https://projeto.exemplo.com', projectId, publishableKey: isolatedPublishableKey }).ok, false);
  for (const protectedProjectId of ['cfmzkthhgliqelozlmwu', 'doufsxqlfjyuvxuezpln']) {
    assert.equal(validateE2ESupabaseTarget({
      url: `https://${protectedProjectId}.supabase.co`,
      projectId: protectedProjectId,
      publishableKey: isolatedPublishableKey,
    }).ok, false);
  }
});

test('os jobs E2E usam credenciais dedicadas e validam o isolamento antes de testar', async () => {
  const workflow = parse(await readFile(new URL('../../.github/workflows/e2e.yml', import.meta.url), 'utf8'));

  for (const jobName of ['e2e', 'e2e-regression']) {
    const job = workflow.jobs[jobName];
    const validatorIndex = job.steps.findIndex((step) => step.run === 'node scripts/qa/validate-e2e-supabase-target.mjs');
    const firstRemoteTestIndex = job.steps.findIndex((step) => /Validar autorização remota|Run E2E smoke|Run E2E regression/.test(step.name ?? ''));
    assert.ok(validatorIndex >= 0, `${jobName} deve validar o destino Supabase`);
    assert.ok(firstRemoteTestIndex > validatorIndex, `${jobName} deve validar o destino antes dos testes remotos`);
    assert.ok(!JSON.stringify(job.env).includes('secrets.'), `${jobName} não deve expor segredos no ambiente global do job`);
    assert.equal(job.steps[validatorIndex].env.E2E_SUPABASE_PROJECT_ID, '${{ vars.E2E_SUPABASE_PROJECT_ID }}');
    assert.equal(job.steps[validatorIndex].env.VITE_SUPABASE_URL, '${{ secrets.E2E_SUPABASE_URL }}');
    assert.equal(job.steps[validatorIndex].env.VITE_SUPABASE_PUBLISHABLE_KEY, '${{ secrets.E2E_SUPABASE_PUBLISHABLE_KEY }}');
    assert.ok(!JSON.stringify(job.steps).includes('secrets.VITE_SUPABASE_'));
  }

  const authorizationStep = workflow.jobs.e2e.steps.find((step) => step.name === 'Validar autorização remota e RLS técnico');
  assert.equal(authorizationStep.env.SUPABASE_SERVICE_ROLE_KEY, '${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}');
  assert.ok(!JSON.stringify(workflow.jobs.e2e.steps.find((step) => step.name === 'Install deps')).includes('secrets.'), 'npm ci não deve receber segredos');
  for (const [jobName, stepName] of [['e2e', 'Run E2E smoke (gate — para na 1ª falha)'], ['e2e-regression', 'Run E2E regression (shard ${{ matrix.shard }}/3)']]) {
    const playwrightStep = workflow.jobs[jobName].steps.find((step) => step.name === stepName);
    assert.equal(playwrightStep.env.E2E_USER_PASSWORD, '${{ secrets.E2E_USER_PASSWORD }}');
    assert.equal(playwrightStep.env.E2E_CLEANUP_TOKEN, '${{ secrets.E2E_CLEANUP_TOKEN }}');
    assert.equal(playwrightStep.env.VITE_SUPABASE_URL, '${{ secrets.E2E_SUPABASE_URL }}');
    assert.equal(playwrightStep.env.VITE_SUPABASE_PUBLISHABLE_KEY, '${{ secrets.E2E_SUPABASE_PUBLISHABLE_KEY }}');
  }
});
