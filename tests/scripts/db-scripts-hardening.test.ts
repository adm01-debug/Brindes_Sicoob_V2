import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeMigrationSql } from '../../scripts/db/classify-migration-backlog.mjs';
import { collectLocalMigrations, compareLedger } from '../../scripts/db/check-migration-ledger-drift.mjs';
import { buildApiInventory } from '../../scripts/db/import-api-inventory.mjs';
import {
  assertConnectionTargetsProject,
  createManagementSqlClient,
  createSupabaseSqlClient,
} from '../../scripts/db/supabase-sql-client.mjs';

const REF = 'cfmzkthhgliqelozlmwu';

describe('drift do ledger — nomes de arquivo', () => {
  function tree(names: Record<string, string>) {
    const root = mkdtempSync(join(tmpdir(), 'ledger-'));
    mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
    for (const [name, sql] of Object.entries(names)) writeFileSync(join(root, 'supabase/migrations', name), sql);
    return root;
  }

  it('.sql fora do padrão vira pendência em vez de sumir', () => {
    const root = tree({
      '20261109120000_ok.sql': 'select 1;',
      '20261109120001-hifen.sql': 'drop table public.quotes;',
      'hotfix.sql': 'drop table public.orders;',
      '20261109130000_x.SQL': 'drop table public.profiles;',
      'LEIAME.md': '# nota',
    });
    const local = collectLocalMigrations(root);
    const results = compareLedger(local, [{ version: '20261109120000', name: 'ok', statements: ['select 1;'] }]);
    const invalid = results.filter((r: { status: string }) => r.status === 'nome_de_arquivo_invalido');
    expect(invalid.map((r: { path: string }) => r.path).sort()).toEqual([
      'supabase/migrations/20261109120001-hifen.sql',
      'supabase/migrations/20261109130000_x.SQL',
      'supabase/migrations/hotfix.sql',
    ]);
    expect(results.some((r: { path?: string }) => r.path?.endsWith('LEIAME.md'))).toBe(false);
  });

  it('arquivo no padrão e alinhado ao ledger continua sem pendência', () => {
    const root = tree({ '20261109120000_ok.sql': 'select 1;' });
    const results = compareLedger(collectLocalMigrations(root), [
      { version: '20261109120000', name: 'ok', statements: ['select 1;'] },
    ]);
    expect(results.map((r: { status: string }) => r.status)).toEqual(['alinhada']);
  });
});

describe('classificador do backlog de migrations — operações destrutivas', () => {
  const flags = (sql: string) => analyzeMigrationSql(sql).flags;

  it.each([
    ['DROP SCHEMA', 'DROP SCHEMA public CASCADE;', 'drop_objeto'],
    ['DROP SEQUENCE', 'DROP SEQUENCE public.s;', 'drop_objeto'],
    ['DROP EXTENSION', 'DROP EXTENSION pgcrypto;', 'drop_objeto'],
    ['DROP OWNED', 'DROP OWNED BY app_role;', 'drop_objeto'],
    ['ALTER TABLE ... DROP COLUMN', 'ALTER TABLE public.profiles DROP COLUMN email;', 'drop_estrutura'],
    ['ALTER TABLE ... DROP sem a palavra COLUMN', 'ALTER TABLE public.profiles DROP email;', 'drop_estrutura'],
    ['ALTER TABLE ... DROP CONSTRAINT', 'ALTER TABLE public.profiles DROP CONSTRAINT c;', 'drop_estrutura'],
  ])('%s é sinalizado', (_label, sql, flag) => {
    expect(flags(sql)).toContain(flag);
  });

  it.each([
    ['DROP DEFAULT', 'ALTER TABLE public.t ALTER COLUMN a DROP DEFAULT;'],
    ['DROP NOT NULL', 'ALTER TABLE public.t ALTER COLUMN a DROP NOT NULL;'],
    ['DROP IDENTITY', 'ALTER TABLE public.t ALTER COLUMN a DROP IDENTITY;'],
  ])('%s não é destrutivo', (_label, sql) => {
    expect(flags(sql)).not.toContain('drop_estrutura');
  });
});

describe('import do inventário da API — data da coleta', () => {
  // Snapshot válido em tudo, menos (eventualmente) a data: o teste só passa/falha pela data.
  const api = { host: `${REF}.supabase.co`, definitions: { quotes: { properties: {} } }, paths: { '/rpc/f': {} } };
  const build = (capturedAt: string) => buildApiInventory(api, [], capturedAt, {});

  it.each([
    ['2026-02-31', /calendário/],
    ['2026-13-01', /./],
    ['2099-01-01', /futuro/],
    ['ontem', /data real/],
  ])('rejeita %s', (date, reason) => {
    expect(() => build(date)).toThrow(reason);
  });

  it('aceita uma data real do passado', () => {
    expect(build('2026-10-14').generated_at).toBe('2026-10-14');
  });
});

describe('cliente SQL — resposta da Management API', () => {
  const client = (response: Response) =>
    createManagementSqlClient({ projectRef: REF, accessToken: 'tok', fetchImpl: async () => response });

  it('HTTP 200 com HTML (proxy) é erro, não "zero linhas"', async () => {
    await expect(client(new Response('<html>erro</html>', { status: 200 })).query('select 1')).rejects.toThrow(/não é JSON/);
  });

  it('HTTP 200 com corpo vazio é erro', async () => {
    await expect(client(new Response('', { status: 200 })).query('select 1')).rejects.toThrow(/não é JSON/);
  });

  it.each([['[]', []], ['{}', []], ['[{"a":1}]', [{ a: 1 }]]])('aceita corpo %s', async (body, rows) => {
    const result = await client(new Response(body, { status: 201 })).query('select 1');
    expect(result.rows).toEqual(rows);
  });

  it('erro HTTP continua trazendo a mensagem sanitizada, sem o token', async () => {
    const promise = client(new Response(JSON.stringify({ message: 'sem permissão' }), { status: 403 })).query('x');
    await expect(promise).rejects.toThrow('Management API recusou SQL (403): sem permissão');
    await expect(promise).rejects.not.toThrow(/tok/);
  });
});

describe('cliente SQL — conexão direta só para o projeto pedido', () => {
  const ok = [
    `postgresql://postgres:senha@db.${REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${REF}:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgres://postgres:senha@db.${REF}.supabase.co:5432/postgres?sslmode=verify-full`,
  ];
  const bad = [
    'postgresql://postgres:senha@127.0.0.1:5432/postgres',
    'postgresql://postgres:senha@db.doufsxqlfjyuvxuezpln.supabase.co:5432/postgres',
    `postgresql://postgres.pgxfvjmuubtbowutlide:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://outro:senha@db.${REF}.supabase.co:5432/postgres`,
    `http://postgres:senha@db.${REF}.supabase.co:5432/postgres`,
    'não é uma url',
  ];

  it.each(ok)('aceita %s', (url) => {
    expect(() => assertConnectionTargetsProject(url, REF)).not.toThrow();
  });

  it.each(bad)('recusa %s sem ecoar a senha', (url) => {
    expect(() => assertConnectionTargetsProject(url, REF)).toThrow();
    try {
      assertConnectionTargetsProject(url, REF);
    } catch (error) {
      expect((error as Error).message).not.toContain('senha');
    }
  });

  describe('createSupabaseSqlClient', () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env = { ...saved };
    });

    it('recusa SUPABASE_DB_URL de outro banco antes de conectar', async () => {
      delete process.env.SUPABASE_ACCESS_TOKEN;
      process.env.SUPABASE_DB_URL = 'postgresql://postgres:senha@127.0.0.1:5432/postgres';
      await expect(createSupabaseSqlClient({ projectRef: REF })).rejects.toThrow(/deve apontar ao projeto/);
    });

    it('não usa mais DATABASE_URL genérica como fallback', async () => {
      delete process.env.SUPABASE_ACCESS_TOKEN;
      delete process.env.SUPABASE_DB_URL;
      process.env.DATABASE_URL = 'postgresql://postgres:senha@127.0.0.1:5432/postgres';
      await expect(createSupabaseSqlClient({ projectRef: REF })).rejects.toThrow(/Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_URL/);
    });
  });
});
