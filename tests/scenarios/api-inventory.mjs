import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiInventory } from '../../scripts/db/import-api-inventory.mjs';
import { compareInventorySnapshots } from '../../scripts/db/check-live-api-inventory.mjs';

test('inventário preserva somente o contrato observado no projeto correto', () => {
  const api = {
    host: 'cfmzkthhgliqelozlmwu.supabase.co',
    definitions: { produtos: {} },
    paths: { '/produtos': {}, '/rpc/consulta': {} },
  };
  const result = buildApiInventory(api, [{ id: 'proposals' }], '2026-09-22', {});
  assert.deepEqual(result.relations, ['produtos']);
  assert.deepEqual(result.functions, ['consulta']);
  assert.equal(result.generated_at, '2026-09-22');
  assert.throws(() =>
    buildApiInventory({ ...api, host: 'outro-projeto.supabase.co' }, [], '2026-09-22', {}),
  );
  assert.throws(() => buildApiInventory(api, [{ nome: 'sem_id' }], '2026-09-22', {}));
});

test('comparação do inventário detecta deriva nas duas direções', () => {
  const base = {
    project_ref: 'cfmzkthhgliqelozlmwu',
    relations: ['a', 'b'],
    functions: ['consulta'],
    buckets: ['proposals'],
  };
  assert.deepEqual(compareInventorySnapshots(base, structuredClone(base)), []);
  const live = {
    ...base,
    relations: ['b', 'c'],
    functions: [],
    buckets: ['proposals', 'artwork'],
  };
  assert.deepEqual(compareInventorySnapshots(base, live), [
    { kind: 'relations', missing_live: ['a'], missing_cache: ['c'] },
    { kind: 'functions', missing_live: ['consulta'], missing_cache: [] },
    { kind: 'buckets', missing_live: [], missing_cache: ['artwork'] },
  ]);
});
