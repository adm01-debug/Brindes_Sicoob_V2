import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { hasTransactionControl } from '../../scripts/db/apply-sicoob-migrations.mjs';

// O lote management-api executa tudo numa única transação: qualquer controle
// transacional na migration quebraria a promessa de aplicação atômica.
describe('hasTransactionControl — scanner de controle transacional', () => {
  it.each([
    'BEGIN;',
    '  COMMIT;',
    'END;',
    'END TRANSACTION;',
    'END AND CHAIN;',
    'COMMIT WORK;',
    'COMMIT AND CHAIN;',
    'ABORT;',
    'START TRANSACTION;',
    'SELECT 1; COMMIT;',
    'ROLLBACK TO SAVEPOINT ponto;',
  ])('detecta %s', (sql) => {
    expect(hasTransactionControl(sql)).toBe(true);
  });

  it.each([
    'CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;',
    "DO $$ BEGIN RAISE NOTICE ''x''; END; $$;",
    '-- COMMIT;',
    '/* COMMIT; */ SELECT 1;',
    "INSERT INTO t VALUES ('COMMIT;');",
    'CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $f$ BEGIN RETURN 1; END; $f$;',
    'SELECT CASE WHEN true THEN 1 END;',
    'SELECT 1;',
  ])('permite %s', (sql) => {
    expect(hasTransactionControl(sql)).toBe(false);
  });
});

describe('proteção de ambiente do aplicador de migrations', () => {
  it('recusa o projeto Supabase canônico antes de qualquer acesso remoto', () => {
    const result = spawnSync(process.execPath, [
      'scripts/db/apply-sicoob-migrations.mjs',
      '--check',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_PROJECT_REF: 'cfmzkthhgliqelozlmwu',
        SUPABASE_ACCESS_TOKEN: 'token-de-teste-nao-utilizado',
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Aplicação de migrations no projeto canônico está bloqueada');
  });

  it('recusa alvo ausente antes de qualquer acesso remoto', () => {
    const env = { ...process.env };
    delete env.SUPABASE_PROJECT_REF;
    delete env.SUPABASE_DB_URL;
    delete env.SUPABASE_ACCESS_TOKEN;
    const result = spawnSync(process.execPath, [
      'scripts/db/apply-sicoob-migrations.mjs',
      '--check',
    ], { cwd: process.cwd(), encoding: 'utf8', env });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SUPABASE_PROJECT_REF deve identificar explicitamente');
  });
});
