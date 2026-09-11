import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createReadOnlyCatalogFetch, isReadOnlyCatalogRequest, CATALOG_ORIGIN } from '../../supabase/functions/_shared/external-read-only.ts';
import { PERMISSIONS, ALLOWED_RPCS } from '../../supabase/functions/_shared/external-db-config.ts';
import { redactInternalCatalogFields } from '../../supabase/functions/_shared/catalog-redaction.ts';

for (const operation of ['insert','update','delete','upsert','batch_insert','truncate','execute_sql']) {
  test(`bloqueia ${operation} no contrato e nas permissões`, () => {
    assert.equal(isReadOnlyCatalogRequest({ operation, table: 'products' }), false);
    for (const operations of Object.values(PERMISSIONS)) assert.equal(operations.includes(operation), false);
  });
  test(`bloqueia ${operation} oculto em lote`, () => {
    assert.equal(isReadOnlyCatalogRequest({ operation: 'batch', queries: [{ table: 'products' }, { operation, table: 'products' }] }), false);
  });
}
for (const operation of ['select','ping','rpc']) {
  test(`preserva contrato de ${operation}`, () => assert.equal(isReadOnlyCatalogRequest({ operation }), true));
}
test('lote aceita apenas consultas explícitas ou implícitas', () => {
  assert.equal(isReadOnlyCatalogRequest({ operation: 'batch', queries: [{ table: 'products' }, { table: 'categories', operation: 'select' }] }), true);
  for (const queries of [[], [null], ['products'], Array(11).fill({ table: 'products' }), [{ operation: 'batch', queries: [] }]]) {
    assert.equal(isReadOnlyCatalogRequest({ operation: 'batch', queries }), false);
  }
});
test('RPCs de associação e preenchimento deixam de ser permitidas', () => {
  assert.equal(ALLOWED_RPCS.includes('fn_link_product_print_areas'), false);
  assert.equal(ALLOWED_RPCS.includes('fn_backfill_product_print_areas'), false);
});
for (const method of ['POST','PUT','PATCH','DELETE']) {
  test(`transporte impede ${method} antes de enviar dados`, () => {
    let chamadas = 0;
    const ler = createReadOnlyCatalogFetch(async () => { chamadas++; return new Response(); });
    assert.throws(() => ler(`${CATALOG_ORIGIN}/rest/v1/products`, { method }), /CATALOG_READ_ONLY/);
    assert.throws(() => ler(new Request(`${CATALOG_ORIGIN}/rest/v1/products`, { method })), /CATALOG_READ_ONLY/);
    assert.equal(chamadas, 0);
  });
}
for (const url of ['https://outro.supabase.co/rest/v1/products', `${CATALOG_ORIGIN}/auth/v1/admin/users`, `https://doufsxqlfjyuvxuezpln.supabase.co.atacante.invalid/rest/v1/products`]) {
  test(`não encaminha credenciais à origem ou serviço indevido: ${new URL(url).hostname}`, () => {
    let chamadas = 0;
    assert.throws(() => createReadOnlyCatalogFetch(async () => { chamadas++; return new Response(); })(url), /CATALOG_READ_ONLY/);
    assert.equal(chamadas, 0);
  });
}
for (const path of ['products?select=id', 'rpc/get_category_descendants?category_uuid=exemplo']) {
  test(`consulta usa GET e recusa redirecionamento: ${path}`, async () => {
    let recebido;
    const ler = createReadOnlyCatalogFetch(async (input, init) => { recebido = { input, init }; return new Response('[]'); });
    await ler(`${CATALOG_ORIGIN}/rest/v1/${path}`, { method: 'GET', redirect: 'follow' });
    assert.equal(recebido.init.method, 'GET');
    assert.equal(recebido.init.redirect, 'error');
  });
}

test('remove custo e margem em qualquer profundidade sem alterar a origem', () => {
  const original = {
    id: 'produto-sintetico',
    sale_price: 42,
    cost_price: 21,
    supplier: { supplier_cost: 19, name: 'Fornecedor' },
    variants: [{ internal_cost: 20, color: 'verde' }],
  };
  const safe = redactInternalCatalogFields(original);
  assert.deepEqual(safe, {
    id: 'produto-sintetico',
    sale_price: 42,
    supplier: { name: 'Fornecedor' },
    variants: [{ color: 'verde' }],
  });
  assert.equal(original.cost_price, 21);
});

test('seleção leve do bridge não solicita custo interno', () => {
  const source = readFileSync('supabase/functions/external-db-bridge/index.ts', 'utf8');
  const select = source.match(/const PRODUCTS_LIGHTWEIGHT_SELECT = '([^']+)'/)?.[1];
  assert.ok(select);
  assert.equal(select.includes('cost_price'), false);
  assert.match(source, /result = redactInternalCatalogFields\(result\);/);
});
