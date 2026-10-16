import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateEdgeRuntimeContract } from '../../scripts/lib/edge-runtime-contract.mjs';

const expectedSourceOnly = [
  'e2e-auth-test',
  'error-monitor',
  'generate-mockup-nanobanana',
  'migrate-helper',
  'qa-block-monitor',
  'sicoob-seed-debug',
];

const expectedGatewayJwt = [
  'external-connections-sync',
  'sicoob-approval-reconciliation',
  'sicoob-artwork-register',
  'sicoob-document-ingest',
  'sicoob-kit-quote',
  'sicoob-reorder',
  'verify-email',
];

test('o contrato cobre as 106 fontes e respeita o limite de 100 funções', () => {
  const result = validateEdgeRuntimeContract();
  assert.deepEqual(result.errors, []);
  assert.equal(result.localFunctions.length, 106);
  assert.equal(result.deployed.length, 100);
  assert.deepEqual(result.sourceOnly, expectedSourceOnly);
});

test('o contrato preserva exatamente as sete barreiras JWT do runtime', () => {
  const result = validateEdgeRuntimeContract();
  const protectedFunctions = result.deployed
    .filter((entry) => entry.verifyJwt)
    .map((entry) => entry.name);
  assert.deepEqual(protectedFunctions, expectedGatewayJwt);
});

test('o workflow publica pelo contrato canônico em vez de uma lista parcial', () => {
  const workflow = readFileSync('.github/workflows/deploy-sicoob-functions.yml', 'utf8');
  assert.match(workflow, /node scripts\/deploy-edge-functions\.mjs/);
  assert.doesNotMatch(workflow, /for function_name in/);
});
