import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSource } from '../../scripts/db/check-runtime-refs.mjs';

test('wrapper com alias e genérico é detectado sem importar o cliente diretamente', () => {
  const rows = analyzeSource(`import { untypedFrom as tabela } from '@/lib/supabase-untyped';
    tabela<{ id: string }>('user_passkeys').select('*');`, '/src/exemplo.ts');
  assert.deepEqual(rows.map(r => r.name), ['user_passkeys']);
});
test('namespace e literal template são detectados; exemplos em comentários são ignorados', () => {
  const rows = analyzeSource("import * as db from '@/lib/supabase-untyped';\n// db.untypedFrom('falsa');\ndb.untypedFrom(`real`);", '/src/exemplo.ts');
  assert.deepEqual(rows.map(r => r.name), ['real']);
});
test('referência dinâmica fica explícita para revisão', () => {
  const rows = analyzeSource("import { untypedFrom } from '@/lib/supabase-untyped'; untypedFrom(nome);", '/src/exemplo.ts');
  assert.equal(rows[0].unresolved, true);
});
test('função homônima de outro módulo não é atribuída ao banco interno', () => {
  assert.deepEqual(analyzeSource("import { untypedFrom } from './outro'; untypedFrom('externo');", '/src/exemplo.ts'), []);
});
