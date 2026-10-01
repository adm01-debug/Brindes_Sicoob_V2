#!/usr/bin/env node
import process from "node:process";
import { createSupabaseSqlClient } from "./supabase-sql-client.mjs";

const PROJECT_REF = "cfmzkthhgliqelozlmwu";
const CORE_TABLES = ["profiles", "quote_history", "quotes", "workspace_notifications"];

function validateConnectionString(value) {
  if (!value) throw new Error("SUPABASE_DB_URL não definida.");
  const parsed = new URL(value);
  const direct = parsed.hostname === `db.${PROJECT_REF}.supabase.co`
    && parsed.username === "postgres";
  const pooler = parsed.hostname.endsWith(".pooler.supabase.com")
    && decodeURIComponent(parsed.username) === `postgres.${PROJECT_REF}`;
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
      || (!direct && !pooler)
      || parsed.port !== "5432"
      || parsed.pathname !== "/postgres") {
    throw new Error(`A conexão deve apontar ao banco postgres do projeto ${PROJECT_REF}.`);
  }
  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}

function normalizeRoles(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
  }
  return [];
}

export function isUnrestrictedPermissivePolicy(policy) {
  const roles = normalizeRoles(policy.roles);
  const broadRole = roles.some((role) => ["public", "anon", "authenticated"].includes(role));
  const isTrueOrOmitted = (value) => value == null
    || String(value).replace(/[()\s]/g, "").toLowerCase() === "true";
  const trueUsing = isTrueOrOmitted(policy.qual);
  const trueCheck = isTrueOrOmitted(policy.with_check);
  const unrestrictedExpression = policy.cmd === "INSERT"
    ? trueCheck
    : policy.cmd === "SELECT" || policy.cmd === "DELETE"
      ? trueUsing
      : trueUsing && (policy.with_check == null || trueCheck);
  return policy.permissive === "PERMISSIVE" && broadRole && unrestrictedExpression;
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    process.env.SUPABASE_DB_URL = validateConnectionString(process.env.SUPABASE_DB_URL);
  }
  const client = await createSupabaseSqlClient({
    projectRef: PROJECT_REF,
    readOnly: true,
    applicationName: "sicoob-auditoria-core-rls",
  });
  await client.connect();
  try {
    if (client.transport === "postgres") {
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = '30s'");
    }
    const { rows } = await client.query(`
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS force_rls,
        p.policyname,
        p.permissive,
        p.roles::text[] AS roles,
        p.cmd,
        p.qual,
        p.with_check
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p
        ON p.schemaname = n.nspname AND p.tablename = c.relname
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
      ORDER BY c.relname, p.policyname
    `, [CORE_TABLES]);
    if (client.transport === "postgres") await client.query("ROLLBACK");
    const foundTables = new Set(rows.map((row) => row.table_name));
    const missingTables = CORE_TABLES.filter((table) => !foundTables.has(table));
    const rlsDisabled = [...new Set(rows.filter((row) => !row.rls_enabled).map((row) => row.table_name))];
    const policies = rows.filter((row) => row.policyname != null);
    const unrestricted = policies.filter(isUnrestrictedPermissivePolicy);
    const summary = {
      project_ref: PROJECT_REF,
      mutation: false,
      tables: Object.fromEntries(CORE_TABLES.map((table) => [table, {
        exists: foundTables.has(table),
        rls_enabled: rows.find((row) => row.table_name === table)?.rls_enabled ?? false,
        force_rls: rows.find((row) => row.table_name === table)?.force_rls ?? false,
        policies: policies.filter((row) => row.table_name === table).map((row) => ({
          name: row.policyname,
          permissive: row.permissive,
          roles: row.roles,
          command: row.cmd,
          using: row.qual,
          with_check: row.with_check,
        })),
      }])),
      findings: {
        missing_tables: missingTables,
        rls_disabled: rlsDisabled,
        unrestricted_permissive: unrestricted.map((row) => ({
          table: row.table_name,
          policy: row.policyname,
          roles: row.roles,
          command: row.cmd,
        })),
      },
    };
    console.log(JSON.stringify(summary, null, 2));
    if (missingTables.length || rlsDisabled.length || unrestricted.length) {
      throw new Error("O contrato RLS das tabelas centrais possui achados críticos.");
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("audit-core-rls.mjs")) {
  main().catch((error) => {
    console.error(`[core-rls] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
