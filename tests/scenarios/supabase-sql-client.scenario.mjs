// Executado pelo node:test; fica fora da descoberta do Vitest.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createManagementSqlClient } from "../../scripts/db/supabase-sql-client.mjs";
import {
  buildManagementApiBatch,
  extractContractGuardClauses,
  loadAuthorizedTargets,
  renderContractGuard,
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
    /NOT has_function_privilege\('authenticated', 'public\.assert_quote_transition/,
  );
  assert.match(
    batch,
    /has_function_privilege\('service_role', 'public\.assert_quote_transition/,
  );
  assert.match(batch, /COMMIT;$/);
});

test("isola as cláusulas da guarda de contrato para apontar qual derrubou o lote", () => {
  const clauses = extractContractGuardClauses(buildManagementApiBatch(loadAuthorizedTargets(), new Map()));

  assert.ok(clauses.length > 40, `cláusulas extraídas: ${clauses.length}`);
  assert.ok(clauses.some((clause) => clause.includes("quote_save_idempotency")));
  assert.ok(clauses.some((clause) => clause.includes("favorite_items_list_product_variant_key")));
  // Os corpos de função embutidos também têm "IF ... THEN" e "OR" indentados: nenhum corte
  // pode cair dentro deles, senão a cláusula vira fragmento inválido e o diagnóstico não roda.
  assert.equal(clauses.filter((clause) => /^jsonb_typeof\b/.test(clause)).length, 0);
  assert.equal(clauses.filter((clause) => clause.startsWith("v_discount")).length, 0);
  assert.deepEqual(extractContractGuardClauses("SELECT 1"), []);
});

test("a guarda de contrato nomeia cada cláusula que derrubou o lote", () => {
  const batch = buildManagementApiBatch(loadAuthorizedTargets(), new Map());
  const clauses = extractContractGuardClauses(batch);
  const guard = batch.slice(
    batch.indexOf("DO $sicoob_contract_guard$"),
    batch.indexOf("$sicoob_contract_guard$;"),
  );

  assert.ok(clauses.length > 40, `cláusulas extraídas: ${clauses.length}`);
  assert.match(guard, /falhas text\[\] := ARRAY\[\]::text\[\];/);
  assert.match(
    guard,
    /RAISE EXCEPTION 'O contrato crítico não foi produzido; lote cancelado\. Cláusulas falhando: %\.'/,
  );
  assert.match(guard, /array_to_string\(falhas, ', '\)/);
  // Um IF e um registro de falha por cláusula, na mesma ordem da extração.
  assert.equal((guard.match(/falhas := falhas \|\| 'c\d{2}'::text;/g) ?? []).length, clauses.length);
  assert.match(guard, /falhas := falhas \|\| 'c01'::text;/);
  assert.equal(clauses.length, new Set(clauses).size);

  // Cada cláusula roda em subtransação: erro de avaliação entra na lista com o SQLSTATE em
  // vez de abortar o lote no primeiro problema e esconder o restante do diagnóstico.
  assert.equal(
    (guard.match(/falhas := falhas \|\| \('c\d{2}:' \|\| SQLSTATE\)::text;/g) ?? []).length,
    clauses.length,
  );
  assert.throws(() => renderContractGuard("   "), /sem cláusulas/);
});

test("corta a cadeia de cláusulas mesmo com comentário entre elas", () => {
  const guard = renderContractGuard(`
     relrowsecurity = true -- primeira cláusula
     OR pg_get_indexdef(oid) = 'x'
  `);

  assert.equal((guard.match(/falhas := falhas \|\| 'c\d{2}'::text;/g) ?? []).length, 2);
  assert.equal((guard.match(/EXCEPTION WHEN OTHERS THEN/g) ?? []).length, 2);
  assert.doesNotMatch(guard, /primeira cláusula/);
  assert.match(guard, /IF \(relrowsecurity = true\) THEN/);
});

test("confirma o contrato de cleanup_old_notifications dentro do lote atômico", () => {
  const batch = buildManagementApiBatch(loadAuthorizedTargets(), new Map());

  assert.match(batch, /DO \$sicoob_notification_guard\$/);
  assert.match(batch, /to_regprocedure\('public\.cleanup_old_notifications\(\)'\)/);
  assert.match(batch, /p\.prorettype = 'void'::regtype/);
  assert.match(batch, /Contrato de cleanup_old_notifications violado; lote cancelado\./);
  assert.ok(
    batch.indexOf("$sicoob_notification_guard$;") < batch.indexOf("COMMIT;"),
    "a guarda precisa rodar antes do COMMIT para que a falha reverta o lote",
  );

  const semContrato = buildManagementApiBatch(
    loadAuthorizedTargets().filter((target) => target.version !== "20261125100000"),
    new Map(),
  );
  assert.doesNotMatch(semContrato, /sicoob_notification_guard/);
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
