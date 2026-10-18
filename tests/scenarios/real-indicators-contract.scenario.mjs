import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalogQuality = readFileSync('src/components/admin/CatalogQualityDashboard.tsx', 'utf8');
const demoMode = readFileSync('src/pages/trends/is-demo-mode.ts', 'utf8');
const clientBi = readFileSync('src/hooks/bi/useClientBI.ts', 'utf8');

test('qualidade do catálogo consulta contagens exatas e não fabrica percentuais', () => {
  assert.match(catalogQuality, /v_products_missing_primary_image/);
  assert.match(catalogQuality, /main_category_id_isnull: true/);
  assert.match(catalogQuality, /countMode: "exact"/);
  assert.doesNotMatch(catalogQuality, /catalogSize \* 0\.0[12]/);
  assert.doesNotMatch(catalogQuality, /sincronizações automáticas a cada 6 horas/);
});

test('métrica indisponível é identificada sem declarar zero fictício', () => {
  assert.match(catalogQuality, /duplicatedSkus: null/);
  assert.match(catalogQuality, /não aferido pelo contrato atual do banco mestre/);
  assert.doesNotMatch(catalogQuality, /SKUs duplicados: 0/);
});

test('dados fictícios dependem de modo de demonstração explícito', () => {
  assert.match(demoMode, /get\("demo"\) === "1"/);
  assert.match(clientBi, /const demo = isDemoClient\(clientId\)/);
  assert.match(clientBi, /isMock: true/);
  assert.match(clientBi, /isMock: false/);
});
