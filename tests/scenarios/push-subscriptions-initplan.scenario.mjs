// Executado pelo node:test. Precisa de um PostgreSQL descartável em SICOOB_TEST_DATABASE_URL;
// sem a variável o caso é pulado, para não exigir servidor de banco no runner padrão.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const databaseUrl = process.env.SICOOB_TEST_DATABASE_URL;
const caminhoMigration =
  "supabase/migrations/20261125133000_harden_push_subscriptions_initplan.sql";

// Mesma condição da cláusula c44 da guarda de contrato: nenhuma política de
// `public` pode referenciar auth.uid()/role()/jwt() sem o wrapper de initplan.
const CONSULTA_C44 = `
  SELECT count(*)::int AS quebras
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'admin_audit_log_y%'
    AND (COALESCE(qual, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
      OR COALESCE(with_check, '') ~ 'auth\\.(uid|role|jwt)\\(\\)')
    AND CONCAT_WS(' ', qual, with_check) !~* 'select\\s+auth\\.(uid|role|jwt)\\(\\)'`;

async function carregarCliente() {
  const { default: pg } = await import("pg");
  return pg.Client;
}

async function qualDaPolitica(client) {
  const { rows } = await client.query(
    `SELECT qual FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'push_subscriptions'
       AND policyname = 'Users can manage own subscriptions'`,
  );
  return rows[0]?.qual ?? null;
}

test(
  "migration de initplan repara a política de push_subscriptions (idempotente)",
  { skip: !databaseUrl && "sem SICOOB_TEST_DATABASE_URL" },
  async () => {
    const migration = readFileSync(caminhoMigration, "utf8");
    const Client = await carregarCliente();
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    // Tudo em uma transação com ROLLBACK: o cenário da guarda roda em paralelo e
    // enxerga pg_policies de `public`, então nada pode ficar commitado aqui.
    await client.query("BEGIN");
    try {
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
          AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
        CREATE TABLE public.push_subscriptions(id serial PRIMARY KEY, user_id uuid, endpoint text);
        ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage own subscriptions"
          ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);`);

      assert.match(String(await qualDaPolitica(client)), /^\(auth\.uid\(\) = user_id\)$/,
        "estado inicial precisa ser a política crua que existe em produção");
      const antes = (await client.query(CONSULTA_C44)).rows[0].quebras;
      assert.equal(antes, 1, "a política crua precisa quebrar a c44 antes do reparo");

      await client.query(migration);

      const depois = String(await qualDaPolitica(client));
      assert.match(
        depois,
        /select\s+auth\.uid\(\)/i,
        `a política precisa ficar com initplan, veio: ${depois}`,
      );
      assert.equal(
        (await client.query(CONSULTA_C44)).rows[0].quebras,
        0,
        "nenhuma cláusula c44 pode quebrar depois do reparo",
      );

      await client.query(migration);
      assert.equal(
        await qualDaPolitica(client),
        depois,
        "a segunda execução não pode alterar a política já reparada",
      );
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
);

test(
  "migration de initplan não falha quando a tabela ou a política não existem",
  { skip: !databaseUrl && "sem SICOOB_TEST_DATABASE_URL" },
  async () => {
    const migration = readFileSync(caminhoMigration, "utf8");
    const Client = await carregarCliente();
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query("BEGIN");
    try {
      await client.query("SAVEPOINT antes_do_reparo");
      // Sem a tabela: sai cedo. Com a tabela mas sem a política: também sai cedo.
      await client.query("CREATE TABLE public.push_subscriptions(id serial PRIMARY KEY)");
      await client.query("ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY");
      await client.query(migration);
      await client.query(migration);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
);
