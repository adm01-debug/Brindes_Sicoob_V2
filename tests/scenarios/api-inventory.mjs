import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiInventory } from '../../scripts/db/import-api-inventory.mjs';
import { compareInventorySnapshots, hasBlockingDifferences } from '../../scripts/db/check-live-api-inventory.mjs';

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

test('comparação do inventário detecta alteração estrutural sem mudança de nomes', () => {
  const expected = {
    project_ref: 'cfmzkthhgliqelozlmwu',
    relations: ['products'],
    functions: ['search_products'],
    buckets: ['products'],
    contract_sha256: {
      relations: { products: 'contrato-anterior' },
      functions: { search_products: 'contrato-estavel' },
      buckets: { products: 'contrato-estavel' },
    },
  };
  const live = {
    ...expected,
    contract_sha256: {
      ...expected.contract_sha256,
      relations: { products: 'contrato-novo' },
    },
  };

  assert.deepEqual(compareInventorySnapshots(expected, live), [
    {
      kind: 'contract_sha256',
      contract_kind: 'relations',
      changed: ['products'],
    },
  ]);
});

test('evolução legítima (adição e mudança de contrato) não é bloqueante', () => {
  const expected = {
    project_ref: 'cfmzkthhgliqelozlmwu',
    relations: ['products'],
    functions: ['search_products'],
    buckets: ['products'],
    contract_sha256: {
      relations: { products: 'contrato-anterior' },
      functions: { search_products: 'contrato-estavel' },
      buckets: { products: 'contrato-estavel' },
    },
  };
  const live = {
    ...expected,
    relations: ['products', 'products_new'],
    buckets: ['products', 'logs'],
    contract_sha256: {
      ...expected.contract_sha256,
      relations: { products: 'contrato-novo' },
    },
  };

  const differences = compareInventorySnapshots(expected, live);
  assert.ok(differences.length > 0);
  assert.equal(hasBlockingDifferences(differences), false);
});

test('regressão (item removido do live) continua bloqueante', () => {
  const expected = {
    project_ref: 'cfmzkthhgliqelozlmwu',
    relations: ['products', 'legacy'],
    functions: ['search_products'],
    buckets: ['products'],
  };
  const live = { ...expected, relations: ['products'] };

  const differences = compareInventorySnapshots(expected, live);
  assert.ok(differences.length > 0);
  assert.equal(hasBlockingDifferences(differences), true);

  assert.equal(hasBlockingDifferences([{ kind: 'project_ref', expected: 'a', live: 'b' }]), true);
});
