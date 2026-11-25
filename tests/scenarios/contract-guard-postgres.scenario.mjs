// Executado pelo node:test. Precisa de um PostgreSQL descartável em SICOOB_TEST_DATABASE_URL;
// sem a variável o caso é pulado, para não exigir servidor de banco no runner padrão.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManagementApiBatch,
  extractContractGuardClauses,
  loadAuthorizedTargets,
  renderContractGuard,
  sanitizeContractChain,
} from "../../scripts/db/apply-sicoob-migrations.mjs";

const databaseUrl = process.env.SICOOB_TEST_DATABASE_URL;

async function carregarCliente() {
  const { default: pg } = await import("pg");
  return pg.Client;
}

function extrairGuarda(batch) {
  const inicio = batch.indexOf("DO $sicoob_contract_guard$");
  assert.notEqual(inicio, -1, "guarda de contrato ausente no lote");
  const marcador = "$sicoob_contract_guard$;";
  const fim = batch.indexOf(marcador, inicio) + marcador.length;
  return batch.slice(inicio, fim);
}

async function comBancoDescartavel(executar) {
  const Client = await carregarCliente();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $$;
      CREATE SCHEMA IF NOT EXISTS sicoob_contract_guard_test;
      CREATE TABLE IF NOT EXISTS sicoob_contract_guard_test.probe_schema_migrations(version text PRIMARY KEY);
      TRUNCATE sicoob_contract_guard_test.probe_schema_migrations;
    `);
    await executar(client);
  } finally {
    await client.query("DROP SCHEMA IF EXISTS sicoob_contract_guard_test CASCADE").catch(() => {});
    await client.end();
  }
}

const loteReal = buildManagementApiBatch(loadAuthorizedTargets(), new Map());

test("guarda de contrato segue após erro de avaliação e nomeia cada cláusula", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    const guarda = renderContractGuard(`
     false
     OR (SELECT 1 / 0) = 1
     OR to_regclass('public.nao_existe') IS NULL
    `);

    await assert.rejects(client.query(guarda), (error) => {
      assert.match(error.message, /O contrato crítico não foi produzido; lote cancelado\./);
      // c01 é falso e não entra na lista; c02 não pôde ser avaliada e entra com o SQLSTATE
      // (22012 = divisão por zero) sem abortar as cláusulas seguintes; c03 é verdadeira.
      assert.match(error.message, /Cláusulas falhando: c02:22012, c03\.$/);
      assert.doesNotMatch(error.message, /c01/);
      return true;
    });
  });
});

test("guarda de contrato aceita cláusulas satisfeitas e mantém o lote", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    const guarda = renderContractGuard(`
     to_regclass('sicoob_contract_guard_test.probe_schema_migrations') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'probe_schema_migrations')
    `);

    await client.query("BEGIN");
    await client.query(
      "INSERT INTO sicoob_contract_guard_test.probe_schema_migrations(version) VALUES ('20261125100000')",
    );
    await client.query(guarda);
    await client.query("COMMIT");
    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM sicoob_contract_guard_test.probe_schema_migrations",
    );
    assert.equal(rows[0].total, 1, "cláusulas satisfeitas não podem derrubar o lote");
  });
});

test("a guarda do lote real lista o inventário de cláusulas e reverte a transação", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  const total = extractContractGuardClauses(loteReal).length;
  assert.ok(total > 40, `cláusulas extraídas: ${total}`);

  await comBancoDescartavel(async (client) => {
    let mensagem = "";
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO sicoob_contract_guard_test.probe_schema_migrations(version) VALUES ('20261125100000')",
    );
    await assert.rejects(client.query(extrairGuarda(loteReal)), (error) => {
      mensagem = error.message;
      return true;
    });

    assert.match(mensagem, /O contrato crítico não foi produzido; lote cancelado\./);
    const rotulos = mensagem
      .split("Cláusulas falhando: ")[1]
      .replace(/\.\s*$/, "")
      .split(",")
      .map((rotulo) => rotulo.trim());
    assert.equal(rotulos[0], "c01", "a primeira cláusula da cadeia precisa ser rastreável");
    assert.ok(
      rotulos.length > 40,
      `o inventário precisa cobrir quase toda a cadeia; veio ${rotulos.length} de ${total}`,
    );
    assert.ok(
      rotulos.some((rotulo) => /^c\d{2}:\d{5}$/.test(rotulo)),
      "cláusula que não pôde ser avaliada precisa entrar com o SQLSTATE no inventário",
    );

    await client.query("ROLLBACK");
    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM sicoob_contract_guard_test.probe_schema_migrations",
    );
    assert.equal(rows[0].total, 0, "o registro do lote não pode sobreviver ao aborto da guarda");
  });
});

test("a guarda roda dentro da transação do lote real, antes do COMMIT", () => {
  // Comparação por linha inteira sobre o SQL sem comentários (strings e dollar quotes
  // preservados): um COMMIT; em literal ou seguido de comentário não conta como controle
  // de transação, e um COMMIT; entre a guarda e o fim do lote é detectado.
  const linhas = sanitizeContractChain(loteReal)
    .split("\n")
    .map((linha) => linha.trim());
  const iBegin = linhas.indexOf("BEGIN;");
  const totalCommits = linhas.filter((linha) => linha === "COMMIT;").length;
  const iCommit = linhas.lastIndexOf("COMMIT;");
  const iGuarda = linhas.findIndex((linha) => linha.includes("DO $sicoob_contract_guard$"));

  assert.equal(iBegin, 0, "o lote precisa abrir com BEGIN;");
  assert.notEqual(iGuarda, -1, "guarda de contrato ausente no lote");
  assert.equal(totalCommits, 1, "o lote precisa ter um único COMMIT;");
  assert.ok(iGuarda > iBegin, "a guarda precisa rodar depois do BEGIN");
  assert.ok(iGuarda < iCommit, "o COMMIT precisa vir depois da guarda");
});
