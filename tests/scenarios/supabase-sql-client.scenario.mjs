// Executado pelo node:test; fica fora da descoberta do Vitest.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createManagementSqlClient } from "../../scripts/db/supabase-sql-client.mjs";
import {
  APPROVAL_WORKER_MONITOR_SAFE_SQL,
  buildManagementApiBatch,
  loadAuthorizedTargets,
  validateLedger,
} from "../../scripts/db/apply-sicoob-migrations.mjs";

const PROJECT_REF = "cfmzkthhgliqelozlmwu";

test("envia consulta parametrizada ao projeto canônico sem expor o token", async () => {
  let request;
  const accessToken = randomUUID();
  const client = createManagementSqlClient({
    projectRef: PROJECT_REF,
    accessToken,
    readOnly: true,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify([{ version: "20260928162048" }]), { status: 201 });
    },
  });
  const result = await client.query("SELECT $1::text AS version", ["20260928162048"]);

  assert.deepEqual(result.rows, [{ version: "20260928162048" }]);
  assert.equal(request.url, `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`);
  assert.deepEqual(JSON.parse(request.options.body), {
    query: "SELECT $1::text AS version",
    parameters: ["20260928162048"],
    read_only: true,
  });
  assert.equal(request.options.headers.authorization, `Bearer ${accessToken}`);
});

test("recusa project ref inválido antes da chamada remota", () => {
  assert.throws(
    () => createManagementSqlClient({ projectRef: "outro-projeto", accessToken: randomUUID() }),
    /Project ref do Supabase inválido/,
  );
});

test("retorna erro sanitizado quando a API recusa a consulta", async () => {
  const accessToken = randomUUID();
  const client = createManagementSqlClient({
    projectRef: PROJECT_REF,
    accessToken,
    fetchImpl: async () => new Response(JSON.stringify({ message: "permissão insuficiente" }), { status: 403 }),
  });

  await assert.rejects(
    client.query("SELECT 1"),
    (error) => error.message === "Management API recusou SQL (403): permissão insuficiente"
      && !error.message.includes(accessToken),
  );
});

test("monta lote atômico somente com migrations allowlisted e guarda do ledger", () => {
  const batch = buildManagementApiBatch(loadAuthorizedTargets(), new Map());

  assert.match(batch, /^BEGIN;/);
  assert.match(batch, /pg_advisory_xact_lock/);
  assert.match(batch, /O ledger mudou depois do preflight/);
  assert.match(batch, /CREATE TABLE public\.quote_save_idempotency/);
  assert.match(batch, /CREATE OR REPLACE FUNCTION public\.bulk_update_quote_status_atomic/);
  assert.match(batch, /sicoob_approval_worker_dispatches_request_id_key/);
  assert.match(batch, /idx_sicoob_approval_worker_queued_request/);
  assert.match(batch, /pg_get_indexdef\(i\.indexrelid\)/);
  assert.match(batch, /monitor_sicoob_approval_worker\(\)/);
  assert.match(batch, /DISTINCT ON \(r\.id\)/);
  assert.match(batch, /pending_status/);
  assert.match(batch, /r\.created ASC/);
  assert.match(batch, /has_newer_result/);
  assert.match(batch, /ID reciclado; resposta correlacionada ao disparo mais recente/);
  assert.match(batch, /Corpo do monitor divergiu do contrato esperado/);
  assert.match(batch, /O contrato crítico não foi produzido/);
  assert.doesNotMatch(
    batch,
    /OR NOT has_function_privilege\('authenticated', 'public\.assert_quote_transition/,
  );
  assert.match(
    batch,
    /OR has_function_privilege\('service_role', 'public\.assert_quote_transition/,
  );
  assert.match(batch, /COMMIT;$/);
});

test("valida a correlação do monitor pelo disparo mais recente", () => {
  assert.match(APPROVAL_WORKER_MONITOR_SAFE_SQL, /DISTINCT ON \(r\.id\)/);
  assert.match(
    APPROVAL_WORKER_MONITOR_SAFE_SQL,
    /ORDER BY r\.id, d\.requested_at DESC, r\.created ASC/,
  );
  assert.match(APPROVAL_WORKER_MONITOR_SAFE_SQL, /WHERE d\.id=r\.dispatch_id/);
});

test("valida marcador criptográfico registrado pelo executor administrativo", () => {
  const sql = "select 1;";
  const sha256 = createHash("sha256").update(sql).digest("hex");
  const target = { version: "20261014124500", name: "exemplo", sql, sha256 };
  const applied = new Map([
    [
      target.version,
      {
        version: target.version,
        name: target.name,
        statements: [`sha256:${sha256}; executor:allowlisted-management-api`],
      },
    ],
  ]);

  assert.doesNotThrow(() => validateLedger([target], applied));
  applied.get(target.version).statements = [
    `sha256:${"0".repeat(64)}; executor:allowlisted-management-api`,
  ];
  assert.throws(() => validateLedger([target], applied), /Conteúdo divergente/);
});
