import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const freight = readFileSync('src/components/kit-builder/FreightEstimator.tsx', 'utf8');

test('planejamento de frete não apresenta tabela ou preço fictício', () => {
  assert.doesNotMatch(freight, /FREIGHT_TABLE/);
  assert.doesNotMatch(freight, /SP Capital/);
  assert.doesNotMatch(freight, /SEDEX|PAC/);
  assert.match(freight, /Cotação pendente/);
  assert.match(freight, /Nenhum valor estimado é somado ao orçamento/);
});
