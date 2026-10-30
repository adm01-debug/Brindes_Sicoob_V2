import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSource, assertInventoryFresh } from '../../scripts/db/check-runtime-refs.mjs';

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
