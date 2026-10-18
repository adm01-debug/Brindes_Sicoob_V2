import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSource,
  assertInventoryFresh,
  projectAuthorizedRuntimeObjects,
} from '../../scripts/db/check-runtime-refs.mjs';

test('wrapper com alias e genérico é detectado sem importar o cliente diretamente', () => {
  const rows = analyzeSource(
    `import { untypedFrom as tabela } from '@/lib/supabase-untyped';
    tabela<{ id: string }>('user_passkeys').select('*');`,
    '/src/exemplo.ts',
  );
  assert.deepEqual(
    rows.map((r) => r.name),
    ['user_passkeys'],
  );
});
test('namespace e literal template são detectados; exemplos em comentários são ignorados', () => {
  const rows = analyzeSource(
    "import * as db from '@/lib/supabase-untyped';\n// db.untypedFrom('falsa');\ndb.untypedFrom(`real`);",
    '/src/exemplo.ts',
  );
  assert.deepEqual(
    rows.map((r) => r.name),
    ['real'],
  );
});
test('referência dinâmica fica explícita para revisão', () => {
  const rows = analyzeSource(
    "import { untypedFrom } from '@/lib/supabase-untyped'; untypedFrom(nome);",
    '/src/exemplo.ts',
  );
  assert.equal(rows[0].unresolved, true);
});
test('função homônima de outro módulo não é atribuída ao banco interno', () => {
  assert.deepEqual(
    analyzeSource(
      "import { untypedFrom } from './outro'; untypedFrom('externo');",
      '/src/exemplo.ts',
    ),
    [],
  );
});

test('inventário remoto recente é aceito e expõe sua idade', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const result = assertInventoryFresh('2026-10-06T12:00:00Z', now, 30);
  assert.equal(result.ageDays, 1);
});

test('inventário remoto expirado, inválido ou no futuro bloqueia o gate', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  assert.throws(
    () => assertInventoryFresh('2026-09-01T12:00:00Z', now, 30),
    /Inventário remoto expirado/,
  );
  assert.throws(() => assertInventoryFresh('data-inválida', now, 30), /Data de coleta/);
  assert.throws(() => assertInventoryFresh('2026-10-08T12:00:00Z', now, 30), /está no futuro/);
});

test('migration autorizada projeta RPC ainda ausente do inventário remoto', () => {
  const result = projectAuthorizedRuntimeObjects(
    { relations: ['orders'], functions: ['existing_rpc'] },
    [
      {
        file: 'supabase/migrations/20261016193000_rpc.sql',
        version: '20261016193000',
        sql: `CREATE OR REPLACE FUNCTION public.set_custom_kit_pinned(p_id uuid)
          RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;`,
      },
    ],
  );

  assert.equal(result.functions.has('set_custom_kit_pinned'), true);
  assert.deepEqual(result.projected, [
    {
      kind: 'function',
      name: 'set_custom_kit_pinned',
      migration: 'supabase/migrations/20261016193000_rpc.sql',
      version: '20261016193000',
    },
  ]);
});

test('DROP posterior remove objeto projetado e texto dentro do corpo não vira DDL', () => {
  const result = projectAuthorizedRuntimeObjects(
    { relations: [], functions: [] },
    [
      {
        file: '001_create.sql',
        version: '001',
        sql: `CREATE FUNCTION public.temporary_rpc() RETURNS text LANGUAGE plpgsql AS $$
          BEGIN RETURN 'CREATE TABLE public.falsa(id int)'; END
        $$;`,
      },
      {
        file: '002_drop.sql',
        version: '002',
        sql: 'DROP FUNCTION IF EXISTS public.temporary_rpc();',
      },
    ],
  );

  assert.equal(result.functions.has('temporary_rpc'), false);
  assert.equal(result.relations.has('falsa'), false);
  assert.deepEqual(result.projected, []);
});

test('projeção recebe somente migrations ausentes do ledger remoto', () => {
  const applied = new Set(['001']);
  const targets = [
    { version: '001', file: '001.sql', sql: 'CREATE FUNCTION public.antiga() RETURNS void;' },
    { version: '002', file: '002.sql', sql: 'CREATE FUNCTION public.nova() RETURNS void;' },
  ];
  const pending = targets.filter((target) => !applied.has(target.version));
  const result = projectAuthorizedRuntimeObjects({ relations: [], functions: [] }, pending);

  assert.equal(result.functions.has('antiga'), false);
  assert.equal(result.functions.has('nova'), true);
});
