import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  extractFunctionBody,
  hasTransactionControl,
  loadAuthorizedTargets,
  validateRecentSecurityMigrationContract,
} from '../../scripts/db/apply-sicoob-migrations.mjs';

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
  it('recusa execução em PR no GitHub Actions antes de acessar qualquer banco', () => {
    const result = spawnSync(process.execPath, [
      'scripts/db/apply-sicoob-migrations.mjs',
      '--check',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_ACTIONS: 'true',
        GITHUB_REF: 'refs/pull/176/merge',
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('migrations só podem ser aplicadas a partir de refs/heads/main');
  });

  it('recusa o projeto Supabase canônico antes de qualquer acesso remoto', () => {
    const env = { ...process.env };
    delete env.GITHUB_ACTIONS;
    delete env.GITHUB_REF;

    const result = spawnSync(process.execPath, [
      'scripts/db/apply-sicoob-migrations.mjs',
      '--check',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...env,
        SUPABASE_PROJECT_REF: 'cfmzkthhgliqelozlmwu',
        SUPABASE_ACCESS_TOKEN: 'token-de-teste-nao-utilizado',
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Aplicação de migrations no projeto canônico está bloqueada');
  });

  it('recusa alvo ausente antes de qualquer acesso remoto', () => {
    const env = { ...process.env };
    delete env.GITHUB_ACTIONS;
    delete env.GITHUB_REF;
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

describe('pós-condições das migrations recentes de segurança', () => {
  const targets = loadAuthorizedTargets();
  const functionNames = [
    'quote_approval_public_items',
    'get_public_quote_approval',
    'register_sicoob_clean_document',
  ];

  function validContract() {
    const functions = Object.fromEntries(functionNames.map((name) => {
      const migration = [...targets].reverse().find((target) =>
        target.sql.includes(`CREATE OR REPLACE FUNCTION public.${name}(`));
      return [name, {
        exists: true,
        source: extractFunctionBody(migration.sql, name),
        security_definer: true,
        safe_search_path: true,
        service_role_execute: true,
        anon_execute: false,
        authenticated_execute: false,
        public_execute: false,
      }];
    }));
    return {
      functions,
      scan_constraint_exists: true,
      scan_constraint_validated: false,
      scan_constraint_definition: "jsonb_typeof(scan_evidence -> 'sha256'::text) IS NOT DISTINCT FROM 'string'::text AND lower(scan_evidence ->> 'sha256'::text) IS NOT DISTINCT FROM sha256",
    };
  }

  it('aceita funções idênticas às migrations, protegidas e constraint NOT VALID', () => {
    expect(() => validateRecentSecurityMigrationContract(validContract(), targets)).not.toThrow();
  });

  it.each([
    ['função ausente', (contract) => { contract.functions.get_public_quote_approval.exists = false; }],
    ['corpo de função divergente', (contract) => { contract.functions.get_public_quote_approval.source += '\n-- divergência'; }],
    ['search_path inseguro', (contract) => { contract.functions.register_sicoob_clean_document.safe_search_path = false; }],
    ['execução anon liberada', (contract) => { contract.functions.quote_approval_public_items.anon_execute = true; }],
    ['execução PUBLIC liberada', (contract) => { contract.functions.get_public_quote_approval.public_execute = true; }],
    ['constraint ausente', (contract) => { contract.scan_constraint_exists = false; }],
    ['constraint validada sem reconciliação histórica', (contract) => { contract.scan_constraint_validated = true; }],
    ['expressão da constraint divergente', (contract) => { contract.scan_constraint_definition = 'sha256 IS NOT NULL'; }],
  ])('rejeita %s', (_scenario, corrupt) => {
    const contract = validContract();
    corrupt(contract);
    expect(() => validateRecentSecurityMigrationContract(contract, targets)).toThrow(
      'Pós-condições de segurança das migrations recentes inválidas',
    );
  });

  it('rejeita allowlist sem uma migration que define a constraint esperada', () => {
    const incompleteTargets = targets.filter((target) =>
      !target.sql.includes('sicoob_document_registry_scan_evidence_sha256_match'));
    expect(() => validateRecentSecurityMigrationContract(validContract(), incompleteTargets)).toThrow(
      'Allowlist incompleta para validar as pós-condições de segurança recentes',
    );
  });
});
