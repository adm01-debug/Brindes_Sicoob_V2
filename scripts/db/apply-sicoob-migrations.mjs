#!/usr/bin/env node
/**
 * Aplica somente migrations explicitamente autorizadas no banco de construção.
 * O projeto possui um backlog histórico fora do ledger; por isso este comando
 * jamais descobre ou aplica automaticamente outros arquivos locais.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const ROOT = process.cwd();
const PROJECT_REF = "cfmzkthhgliqelozlmwu";
const TARGETS = [
  {
    file: "supabase/migrations/20260928162048_quote_save_idempotency.sql",
    sha256: "37944cf181bebbe5fe934b3409cf16d7a83883fc6c1a43e79beca9881c64f78b",
  },
  {
    file: "supabase/migrations/20260928173500_harden_quote_save_idempotency.sql",
    sha256: "b22de15e17e3b90f436a0ea4b55af36cd43303f821f81d55f3e8414df8155e66",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseTarget(target) {
  const filename = basename(target.file);
  const match = /^(\d{14})_(.+)\.sql$/.exec(filename);
  if (!match) throw new Error(`Nome de migration inválido: ${filename}`);
  const sql = readFileSync(join(ROOT, target.file), "utf8");
  const actualHash = sha256(sql);
  if (actualHash !== target.sha256) {
    throw new Error(`Hash não autorizado para ${filename}: ${actualHash}`);
  }
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(sql) || /\bCONCURRENTLY\b/i.test(sql)) {
    throw new Error(`${filename} contém controle transacional incompatível com aplicação atômica.`);
  }
  return { ...target, version: match[1], name: match[2], sql };
}

function validateEnvironment(connectionString) {
  if (!connectionString) throw new Error("SUPABASE_DB_URL não definida.");
  if (!connectionString.includes(PROJECT_REF)) {
    throw new Error(`A conexão não identifica o projeto canônico ${PROJECT_REF}.`);
  }
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("No GitHub Actions, migrations só podem ser aplicadas a partir de refs/heads/main.");
  }
}

async function readApplied(client, targets) {
  const versions = targets.map((target) => target.version);
  const { rows } = await client.query(
    `SELECT version, name
       FROM supabase_migrations.schema_migrations
      WHERE version = ANY($1::text[])
      ORDER BY version`,
    [versions],
  );
  return new Map(rows.map((row) => [row.version, row.name]));
}

async function validateContract(client) {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.quote_save_idempotency') IS NOT NULL AS table_exists,
      EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'save_quote_atomic_idempotent'
          AND p.prosecdef = false
          AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
      ) AS invoker_function_exists,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'SELECT') AS can_select,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'INSERT') AS can_insert,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'UPDATE') AS can_update,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'DELETE') AS can_delete
  `);
  const result = rows[0];
  if (!result?.table_exists || !result.invoker_function_exists || !result.can_select || !result.can_insert
      || result.can_update || result.can_delete) {
    throw new Error(`Contrato remoto de idempotência inválido: ${JSON.stringify(result)}`);
  }
}

async function main() {
  const mode = process.argv[2];
  if (!new Set(["--verify-files", "--check", "--apply", "--require-applied"]).has(mode)) {
    throw new Error("Uso: apply-sicoob-migrations.mjs --verify-files|--check|--apply|--require-applied");
  }

  const targets = TARGETS.map(parseTarget);
  if (mode === "--verify-files") {
    console.log(JSON.stringify({
      project_ref: PROJECT_REF,
      authorized: targets.map(({ version, name, sha256: hash }) => ({ version, name, sha256: hash })),
      mutation: false,
    }, null, 2));
    return;
  }

  const connectionString = process.env.SUPABASE_DB_URL;
  validateEnvironment(connectionString);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    application_name: "sicoob-allowlisted-migrations",
  });

  await client.connect();
  try {
    const before = await readApplied(client, targets);
    const pending = targets.filter((target) => !before.has(target.version));
    console.log(JSON.stringify({
      project_ref: PROJECT_REF,
      authorized: targets.map(({ version, name, sha256: hash }) => ({ version, name, sha256: hash })),
      applied: [...before.keys()],
      pending: pending.map((target) => target.version),
      mutation: mode === "--apply",
    }, null, 2));

    if (mode === "--check") return;
    if (mode === "--require-applied") {
      if (pending.length) throw new Error(`Migrations autorizadas ainda pendentes: ${pending.map((item) => item.version).join(", ")}`);
      await validateContract(client);
      console.log("Contrato e ledger das migrations autorizadas estão reconciliados.");
      return;
    }

    await client.query("SELECT pg_advisory_lock(hashtext('sicoob-allowlisted-migrations'))");
    try {
      for (const target of targets) {
        const current = await readApplied(client, [target]);
        if (current.has(target.version)) {
          console.log(`Migration ${target.version} já registrada; nenhuma escrita executada.`);
          continue;
        }
        await client.query("BEGIN");
        try {
          await client.query(target.sql);
          await client.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, statements, name)
             VALUES ($1, $2::text[], $3)`,
            [target.version, [target.sql], target.name],
          );
          await client.query("COMMIT");
          console.log(`Migration ${target.version} aplicada e registrada atomicamente.`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('sicoob-allowlisted-migrations'))");
    }

    const after = await readApplied(client, targets);
    const missing = targets.filter((target) => !after.has(target.version));
    if (missing.length) throw new Error(`Ledger não registrou: ${missing.map((item) => item.version).join(", ")}`);
    await validateContract(client);
    console.log("Aplicação allowlisted concluída; contrato remoto validado.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[migrations] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
