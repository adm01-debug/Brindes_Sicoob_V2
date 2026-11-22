import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const MIGRATION = 'supabase/migrations/20261122180000_schedule_scheduled_reports_worker.sql';
const migration = readFileSync(MIGRATION, 'utf8');

test('relatórios agendados têm job de cron apontando para a função de envio', () => {
  assert.match(migration, /cron\.schedule\(\s*'scheduled-reports-worker'/);
  assert.match(
    migration,
    /\/functions\/v1\/send-scheduled-reports/,
    'o job precisa chamar a função que envia, não só a que gera',
  );
});

test('o job não embute URL nem segredo: ambos vêm do Vault', () => {
  assert.match(migration, /FROM vault\.decrypted_secrets/);
  assert.match(migration, /name = 'sicoob_project_url'/);
  assert.match(migration, /name = 'sicoob_internal_function_secret'/);
  assert.doesNotMatch(migration, /eyJhbGciOi/, 'nenhum JWT literal no job');
  assert.doesNotMatch(migration, /apikey/, 'nenhuma chave no corpo do job');
});

test('dispatch é SECURITY DEFINER com EXECUTE restrito ao service_role', () => {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.dispatch_scheduled_reports\(\) FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.dispatch_scheduled_reports\(\) TO service_role/,
  );
});

test('o agendamento é idempotente: reaplicar não duplica o job', () => {
  assert.match(migration, /cron\.unschedule\(jobid\)[\s\S]*jobname = 'scheduled-reports-worker'/);
});

test('todo report_type do CHECK do banco é tratado pelo gerador', () => {
  const schema = readdirSync('supabase/migrations')
    .filter((file) => file.endsWith('.sql'))
    .map((file) => readFileSync(`supabase/migrations/${file}`, 'utf8'))
    .find((sql) => sql.includes("CONSTRAINT valid_report_type CHECK"));
  assert.ok(schema, 'CHECK de report_type não encontrado');

  const match = schema.match(/valid_report_type CHECK \(report_type IN \(([^)]+)\)\)/);
  assert.ok(match, 'não foi possível ler os tipos do CHECK');

  const allowed = [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
  assert.deepEqual(allowed.sort(), ['clients', 'orders', 'products', 'quotes', 'sales']);

  const generator = readFileSync('supabase/functions/_shared/scheduled-report-data.ts', 'utf8');
  for (const type of allowed) {
    assert.match(
      generator,
      new RegExp(`report_type === "${type}"|quotesSection\\(`),
      `tipo ${type} sem gerador dedicado`,
    );
  }
});

test('os dois workers de relatório validam o segredo interno antes do service_role', () => {
  for (const name of ['process-scheduled-reports', 'send-scheduled-reports']) {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    const methodGuard = source.search(/req\.method !== ['"]POST['"]/);
    const secretGuard = source.indexOf('requireInternalService(req)');
    const serviceClient = source.indexOf('createClient(');
    assert.ok(methodGuard >= 0 && methodGuard < secretGuard, `${name}: método antes do segredo`);
    assert.ok(secretGuard >= 0 && secretGuard < serviceClient, `${name}: segredo antes do service_role`);
  }
});
