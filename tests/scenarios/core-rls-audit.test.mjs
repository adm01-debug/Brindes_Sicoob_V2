import assert from "node:assert/strict";
import test from "node:test";

import { isUnrestrictedPermissivePolicy } from "../../scripts/db/audit-core-rls.mjs";

test("reprova política permissiva ampla com USING true", () => {
  assert.equal(isUnrestrictedPermissivePolicy({
    permissive: "PERMISSIVE",
    roles: ["public"],
    cmd: "ALL",
    qual: "true",
    with_check: null,
  }), true);
});

test("aceita política restrita por usuário", () => {
  assert.equal(isUnrestrictedPermissivePolicy({
    permissive: "PERMISSIVE",
    roles: ["authenticated"],
    cmd: "SELECT",
    qual: "(seller_id = auth.uid())",
    with_check: null,
  }), false);
});

test("aceita política ampla exclusiva do service_role", () => {
  assert.equal(isUnrestrictedPermissivePolicy({
    permissive: "PERMISSIVE",
    roles: ["service_role"],
    cmd: "ALL",
    qual: "true",
    with_check: "true",
  }), false);
});

test("reprova INSERT amplo mesmo sem expressão USING", () => {
  assert.equal(isUnrestrictedPermissivePolicy({
    permissive: "PERMISSIVE",
    roles: ["authenticated"],
    cmd: "INSERT",
    qual: null,
    with_check: "(true)",
  }), true);
});
