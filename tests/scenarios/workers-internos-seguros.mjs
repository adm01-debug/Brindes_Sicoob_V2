import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workers = [
  'cleanup-notifications',
  'process-queue',
  'send-digest',
  'process-scheduled-reports',
  'send-scheduled-reports',
  'quote-followup-reminders',
  'connections-health-check',
];

const config = readFileSync('supabase/config.toml', 'utf8');

test('workers internos validam segredo e método antes do service_role', () => {
  for (const name of workers) {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    const methodGuard = source.search(/req\.method !== ['"]POST['"]/);
    const secretGuard = source.indexOf('requireInternalService(req)');
    const serviceClient = source.indexOf('createClient(');

    assert.match(source, /internal-service-auth\.ts/);
    assert.ok(methodGuard >= 0 && methodGuard < secretGuard, `${name} deve rejeitar método antes do segredo`);
    assert.ok(secretGuard >= 0 && secretGuard < serviceClient, `${name} não pode criar service_role antes do segredo`);
    assert.match(config, new RegExp(`\\[functions\\.${name}\\]\\s*\\nverify_jwt = false`));
  }
});

test('workers internos não devolvem detalhes de erro ao chamador', () => {
  for (const name of workers) {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    assert.match(source, /erro_interno/);
    assert.doesNotMatch(source, /error:\s*(?:\([^\n]+\)\.)?message/);
  }
});
