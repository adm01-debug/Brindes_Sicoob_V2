import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
    // Barra invertida dentro de uma string E'...' não deve fechá-la antes da
    // hora e mascarar um BEGIN/COMMIT real que venha depois.
    "SELECT E'can\\'t stop'; BEGIN;",
    "SELECT e'can\\'t stop'; COMMIT;",
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
    // Mesmo cenário acima, sem transaction control real depois: continua liberado.
    "SELECT E'can\\'t stop';",
  ])('permite %s', (sql) => {
    expect(hasTransactionControl(sql)).toBe(false);
  });
});

// O backfill de 20261127153000 só pode recuperar um timeout quando a resposta
// do pg_net é atribuível a ele. Se um disparo mais novo reusou o mesmo
// request_id, a resposta pertence ao mais novo e o antigo precisa continuar
// como timeout.
describe('backfill de timeouts do worker de aprovações', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261127153000_fix_approval_dispatch_response_skew.sql'),
    'utf8',
  );

  it('descarta candidatos que tenham um disparo mais novo com o mesmo request_id', () => {
    expect(sql).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM public\.sicoob_approval_worker_dispatches novo/);
    expect(sql).toMatch(/novo\.requested_at>d\.requested_at/);
  });

  it('só recupera disparos em timeout que tenham resposta', () => {
    expect(sql).toMatch(/d\.state='timed_out'/);
    expect(sql).toMatch(/EXISTS \(SELECT 1 FROM net\._http_response r WHERE r\.id=d\.request_id\)/);
  });

  it('aplica a janela de -5s na correlação da resposta', () => {
    expect(sql).toContain("r.created >= d.requested_at - interval '5 seconds'");
  });
});
