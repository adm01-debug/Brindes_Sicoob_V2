// Executado pelo node:test. Precisa de um PostgreSQL descartável em SICOOB_TEST_DATABASE_URL;
// sem a variável o caso é pulado, para não exigir servidor de banco no runner padrão.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManagementApiBatch,
  loadAuthorizedTargets,
} from "../../scripts/db/apply-sicoob-migrations.mjs";

const databaseUrl = process.env.SICOOB_TEST_DATABASE_URL;

async function carregarCliente() {
  const { default: pg } = await import("pg");
  return pg.Client;
}

function extrairGuarda(batch) {
  const inicio = batch.indexOf("DO $sicoob_notification_guard$");
  assert.notEqual(inicio, -1, "guarda de notificações ausente no lote");
  const marcador = "$sicoob_notification_guard$;";
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
      CREATE SCHEMA IF NOT EXISTS sicoob_guard_test;
      CREATE TABLE IF NOT EXISTS sicoob_guard_test.probe_schema_migrations(version text PRIMARY KEY);
      TRUNCATE sicoob_guard_test.probe_schema_migrations;
    `);
    await executar(client);
  } finally {
    await client.query("DROP SCHEMA IF EXISTS sicoob_guard_test CASCADE").catch(() => {});
    await client.query("DROP FUNCTION IF EXISTS public.cleanup_old_notifications()").catch(() => {});
    await client.end();
  }
}

const guarda = extrairGuarda(buildManagementApiBatch(loadAuthorizedTargets(), new Map()));

test("guarda de notificações aborta o lote e não deixa registro de migration", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.cleanup_old_notifications() RETURNS integer
      LANGUAGE sql AS $$ SELECT 0 $$;
      GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO anon;
    `);
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO sicoob_guard_test.probe_schema_migrations(version) VALUES ('20261125100000')",
    );
    await assert.rejects(
      client.query(guarda),
      /Contrato de cleanup_old_notifications violado; lote cancelado/,
    );
    await client.query("ROLLBACK");
    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM sicoob_guard_test.probe_schema_migrations",
    );
    assert.equal(rows[0].total, 0, "o registro de migration não pode sobreviver ao aborto");
  });
});

test("guarda de notificações aceita o contrato de produção e mantém o registro", async (t) => {
  if (!databaseUrl) return t.skip("SICOOB_TEST_DATABASE_URL ausente");
  await comBancoDescartavel(async (client) => {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.cleanup_old_notifications() RETURNS VOID
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;
      REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
      REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon, authenticated;
      GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;
    `);
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO sicoob_guard_test.probe_schema_migrations(version) VALUES ('20261125100000')",
    );
    await client.query(guarda);
    await client.query("COMMIT");
    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM sicoob_guard_test.probe_schema_migrations",
    );
    assert.equal(rows[0].total, 1);
  });
});
