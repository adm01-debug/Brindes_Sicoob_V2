import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectAuthorization } from '../../scripts/lib/edge-authorization-contract.mjs';

const importacao = 'import { authorize as proteger } from "../_shared/authorize.ts";';
for (const source of [
  `${importacao}\n// await proteger(req, {requireRole: "dev"});`,
  `${importacao}\nconst exemplo = 'await proteger(req, {requireRole: "dev"})';`,
  `${importacao}\nawait proteger(req); const outraOpcao = {requireRole: "dev"};`,
  `${importacao}\nproteger(req, {requireRole: "dev"});`,
  'await authorize(req, {requireRole: "dev"});',
]) {
  test(`gate recusa autorização sem chamada real aguardada e opções vinculadas: ${source}`, () => {
    assert.deepEqual(inspectAuthorization(source).sharedRoles, []);
  });
}
test('gate reconhece papel da chamada correta com alias', () => {
  const result = inspectAuthorization(`${importacao}\nconst outraOpcao = { requireRole: "dev" }; await proteger(req, { requireRole: "agente" });`);
  assert.deepEqual(result.sharedRoles, ['agente']);
});
test('comentários e strings não comprovam autenticação customizada', () => {
  const result = inspectAuthorization('// client.auth.getUser();\nconst exemplo = "client.from(\'user_roles\')";');
  assert.equal(result.validatesIdentity, false);
  assert.equal(result.validatesRole, false);
});
test('chamadas customizadas reais são encontradas', () => {
  const result = inspectAuthorization('await client.auth.getUser(); await client.rpc("has_role", args);');
  assert.equal(result.validatesIdentity, true);
  assert.equal(result.validatesRole, true);
});
