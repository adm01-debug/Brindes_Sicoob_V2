import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createManagementSqlClient } from "../../scripts/db/supabase-sql-client.mjs";

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
