import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateE2eSupabaseTarget } from '../../scripts/ci/validate-e2e-supabase-target.mjs';

const qaTarget = {
  url: 'https://sicoob-qa.supabase.co',
  expectedProjectId: 'sicoob-qa',
  configuredProjectId: 'sicoob-qa',
  publishableKey: 'publishable-test-value',
  serviceRoleKey: 'secret-test-value',
};

test('permite apenas um projeto QA HTTPS com as referências alinhadas', () => {
  const result = validateE2eSupabaseTarget(qaTarget);

  assert.equal(result.ok, true);
  assert.equal(result.actualProjectId, 'sicoob-qa');
  assert.deepEqual(result.errors, []);
});

test('bloqueia referência de QA ausente, URL divergente e chaves ausentes', () => {
  const result = validateE2eSupabaseTarget({
    ...qaTarget,
    expectedProjectId: '',
    configuredProjectId: 'outro-projeto',
    publishableKey: '',
    serviceRoleKey: '',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 4);
});

test('bloqueia o projeto canônico mesmo quando as referências coincidem', () => {
  const canonical = 'cfmzkthhgliqelozlmwu';
  const result = validateE2eSupabaseTarget({
    ...qaTarget,
    url: `https://${canonical}.supabase.co`,
    expectedProjectId: canonical,
    configuredProjectId: canonical,
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('banco canônico')));
});

test('recusa URL sem HTTPS, domínio fora do padrão e URL com credenciais embutidas', () => {
  for (const url of [
    'http://sicoob-qa.supabase.co',
    'https://sicoob-qa.example.com',
    'https://usuario:senha@sicoob-qa.supabase.co',
  ]) {
    assert.equal(validateE2eSupabaseTarget({ ...qaTarget, url }).ok, false);
  }
});
