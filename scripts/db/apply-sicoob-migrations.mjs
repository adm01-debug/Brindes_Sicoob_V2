#!/usr/bin/env node
/**
 * Aplica somente migrations explicitamente autorizadas no banco de construção.
 * O projeto possui um backlog histórico fora do ledger; por isso este comando
 * jamais descobre ou aplica automaticamente outros arquivos locais.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { normalizedSql } from "./check-migration-ledger-drift.mjs";
import { createSupabaseSqlClient } from "./supabase-sql-client.mjs";

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
  {
    file: "supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql",
    sha256: "1bfe27ba7e9fddcfe08ed6fb16e1d0bd056cdff95b60a9a61a8f2548337a1a12",
  },
  {
    file: "supabase/migrations/20261002120000_quote_items_identity_preservation.sql",
    sha256: "91981250b714f3945fe450654eacdc47534f20a696ad62e29507ad5ceb6c9beb",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hasTransactionControl(sql) {
  const keywords = ["BEGIN", "COMMIT", "ROLLBACK"];
  return sql.split("\n").some((line) => {
    const normalized = line.trimStart().toUpperCase();
    return keywords.some((keyword) => {
      if (!normalized.startsWith(keyword)) return false;
      return normalized.slice(keyword.length).trimStart().startsWith(";");
    });
  });
}

function parseTarget(target) {
  const filename = basename(target.file);
  const separator = filename.indexOf("_");
  const version = filename.slice(0, separator);
  const name = filename.slice(separator + 1, -4);
  if (!filename.endsWith(".sql") || !/^\d{14}$/.test(version) || !/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Nome de migration inválido: ${filename}`);
  }
  const sql = readFileSync(join(ROOT, target.file), "utf8");
  const actualHash = sha256(sql);
  if (actualHash !== target.sha256) {
    throw new Error(`Hash não autorizado para ${filename}: ${actualHash}`);
  }
  if (hasTransactionControl(sql) || /\bCONCURRENTLY\b/i.test(sql)) {
    throw new Error(`${filename} contém controle transacional incompatível com aplicação atômica.`);
  }
  return { ...target, version, name, sql };
}

export function loadAuthorizedTargets() {
  return TARGETS.map(parseTarget);
}

function validateEnvironment(connectionString) {
  if (!connectionString) throw new Error("SUPABASE_DB_URL não definida.");
  const parsed = new URL(connectionString);
  const directHost = `db.${PROJECT_REF}.supabase.co`;
  const isDirect = parsed.hostname === directHost && parsed.username === "postgres";
  const isSessionPooler = parsed.hostname.endsWith(".pooler.supabase.com")
    && decodeURIComponent(parsed.username) === `postgres.${PROJECT_REF}`;
  const sslModes = parsed.searchParams.getAll("sslmode");
  const conflictingSslParameters = ["ssl", "sslrootcert", "sslcert", "sslkey"]
    .filter((parameter) => parsed.searchParams.has(parameter));
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
      || (!isDirect && !isSessionPooler)
      || parsed.port !== "5432"
      || parsed.pathname !== "/postgres"
      || sslModes.length > 1
      || (sslModes[0] && !new Set(["require", "verify-full"]).has(sslModes[0]))
      || conflictingSslParameters.length > 0) {
    throw new Error(
      `SUPABASE_DB_URL deve apontar ao projeto ${PROJECT_REF}, banco postgres, porta 5432 e TLS verificado.`,
    );
  }
  // A conexão efetiva sempre usa validação completa do certificado, mesmo se
  // o secret legado omitir sslmode ou declarar apenas `require`.
  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}

function validateGitHubRef() {
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("No GitHub Actions, migrations só podem ser aplicadas a partir de refs/heads/main.");
  }
}

function dollarQuote(value, label) {
  let suffix = 0;
  let delimiter;
  do {
    delimiter = `$sicoob_${label}${suffix || ""}$`;
    suffix += 1;
  } while (value.includes(delimiter));
  return `${delimiter}${value}${delimiter}`;
}

function extractFunctionBody(sql, functionName) {
  const declaration = `CREATE OR REPLACE FUNCTION public.${functionName}(`;
  const declarationIndex = sql.indexOf(declaration);
  const delimiter = "AS $function$";
  const start = sql.indexOf(delimiter, declarationIndex);
  const bodyStart = start + delimiter.length;
  const end = sql.indexOf("$function$;", bodyStart);
  if (declarationIndex < 0 || start < 0 || end < 0) {
    throw new Error(`Corpo autorizado não encontrado para public.${functionName}.`);
  }
  return sql.slice(bodyStart, end).trim();
}

async function readApplied(client, targets) {
  const versions = targets.map((target) => target.version);
  const { rows } = await client.query(
    `SELECT version, name, statements
       FROM supabase_migrations.schema_migrations
      WHERE version = ANY($1::text[])
      ORDER BY version`,
    [versions],
  );
  return new Map(rows.map((row) => [row.version, row]));
}

function validateLedger(targets, applied) {
  for (const target of targets) {
    const row = applied.get(target.version);
    if (!row) continue;
    if (row.name !== target.name) {
      throw new Error(`Nome divergente no ledger para ${target.version}: ${row.name}.`);
    }
    if (!Array.isArray(row.statements)) {
      throw new Error(`Statements ausentes no ledger para ${target.version}.`);
    }
    const remoteSql = row.statements.map((statement) => statement.trim().replace(/;\s*$/, "")).join(";\n");
    const remoteHash = sha256(normalizedSql(remoteSql));
    const localHash = sha256(normalizedSql(target.sql));
    if (remoteHash !== localHash) {
      throw new Error(`Conteúdo divergente no ledger para ${target.version}.`);
    }
  }
}

async function validateContract(client, targets) {
  const { rows } = await client.query(`
    WITH target_function AS (
      SELECT to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)') AS oid
    )
    SELECT
      to_regclass('public.quote_save_idempotency') IS NOT NULL AS table_exists,
      COALESCE((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'public.quote_save_idempotency'::regclass), false) AS rls_enabled,
      (SELECT oid IS NOT NULL FROM target_function) AS exact_function_exists,
      COALESCE((SELECT NOT p.prosecdef FROM pg_proc p, target_function f WHERE p.oid = f.oid), false) AS security_invoker,
      COALESCE((SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p, target_function f WHERE p.oid = f.oid), false) AS safe_search_path,
      (SELECT p.prosrc FROM pg_proc p, target_function f WHERE p.oid = f.oid) AS idempotency_source,
      has_function_privilege('authenticated', 'public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)', 'EXECUTE') AS authenticated_can_execute,
      has_function_privilege('anon', 'public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)', 'EXECUTE') AS anon_can_execute,
      COALESCE((
        SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
        FROM pg_proc p, target_function f,
             LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = f.oid
      ), false) AS public_can_execute,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'SELECT') AS can_select,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'INSERT') AS can_insert,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'UPDATE') AS can_update,
      has_table_privilege('authenticated', 'public.quote_save_idempotency', 'DELETE') AS can_delete,
      (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_save_idempotency') AS policy_count,
      (SELECT jsonb_object_agg(policyname, jsonb_build_object(
          'roles', roles, 'cmd', cmd, 'qual', qual, 'with_check', with_check
        ))
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'quote_save_idempotency') AS policy_contracts,
      EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'quote_save_idempotency'
          AND policyname = 'quote_save_idempotency_select_own' AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::name[]
          AND qual LIKE '%auth.uid()%actor_id%'
          AND with_check IS NULL
      ) AS select_policy_safe,
      EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'quote_save_idempotency'
          AND policyname = 'quote_save_idempotency_insert_own' AND cmd = 'INSERT'
          AND roles = ARRAY['authenticated']::name[]
          AND qual IS NULL
          AND with_check LIKE '%auth.uid()%actor_id%'
          AND with_check LIKE '%seller_id%'
      ) AS insert_policy_safe,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quote_save_idempotency'::regclass AND contype = 'p'
          AND pg_get_constraintdef(oid) = 'PRIMARY KEY (actor_id, idempotency_key)'
      ) AS primary_key_exists,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quote_save_idempotency'::regclass AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (actor_id) REFERENCES auth.users(id)%'
      ) AS actor_fk_exists,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quote_save_idempotency'::regclass AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (quote_id) REFERENCES quotes(id)%'
      ) AS quote_fk_exists,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quote_save_idempotency'::regclass
          AND conname = 'quote_save_idempotency_payload_hash_check'
          AND pg_get_constraintdef(oid) LIKE '%32%'
          AND pg_get_constraintdef(oid) LIKE '%64%'
      ) AS hash_constraint_exists,
      (SELECT jsonb_object_agg(conname, pg_get_constraintdef(oid))
        FROM pg_constraint
        WHERE conrelid = 'public.quote_save_idempotency'::regclass) AS constraint_contracts,
      (SELECT p.prosrc FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')) AS status_source,
      (SELECT p.prosrc FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.notify_singular_quote_submission()')) AS notification_source,
      COALESCE((SELECT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
        FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')), false) AS status_security_safe,
      has_function_privilege('authenticated', 'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE') AS status_authenticated_execute,
      has_function_privilege('anon', 'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE') AS status_anon_execute,
      COALESCE((SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
        FROM pg_proc p,
          LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')), false) AS status_public_execute,
      has_function_privilege('authenticated', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE') AS transition_assert_authenticated_execute,
      has_function_privilege('anon', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE') AS transition_assert_anon_execute,
      COALESCE((SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
        FROM pg_proc p,
          LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')), false) AS transition_assert_public_execute,
      has_function_privilege('authenticated', 'public.notify_singular_quote_submission()', 'EXECUTE') AS notification_authenticated_execute,
      has_function_privilege('anon', 'public.notify_singular_quote_submission()', 'EXECUTE') AS notification_anon_execute,
      COALESCE((SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
        FROM pg_proc p,
          LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = to_regprocedure('public.notify_singular_quote_submission()')), false) AS notification_public_execute,
      EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.quotes'::regclass
          AND t.tgname = 'trg_notify_singular_quote_submission'
          AND NOT t.tgisinternal
          AND t.tgenabled = 'O'
          AND p.proname = 'notify_singular_quote_submission'
          AND p.prosecdef
          AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
      ) AS notification_trigger_safe,
      (SELECT pg_get_triggerdef(t.oid)
        FROM pg_trigger t
        WHERE t.tgrelid = 'public.quotes'::regclass
          AND t.tgname = 'trg_notify_singular_quote_submission'
          AND NOT t.tgisinternal) AS notification_trigger_definition
  `);
  const result = rows[0];
  const idempotencyMigration = targets.find((target) => target.version === "20260928173500");
  const statusMigration = targets.find((target) => target.version === "20260928182000");
  if (!idempotencyMigration || !statusMigration) {
    throw new Error("Allowlist incompleta para validar os corpos das funções críticas.");
  }
  const sourceHashesValid = typeof result?.idempotency_source === "string"
    && typeof result.status_source === "string"
    && typeof result.notification_source === "string"
    && sha256(result.idempotency_source.trim()) === sha256(
      extractFunctionBody(idempotencyMigration.sql, "save_quote_atomic_idempotent"),
    )
    && sha256(result.status_source.trim()) === sha256(
      extractFunctionBody(statusMigration.sql, "bulk_update_quote_status_atomic"),
    )
    && sha256(result.notification_source.trim()) === sha256(
      extractFunctionBody(statusMigration.sql, "notify_singular_quote_submission"),
    );
  const normalizeExpression = (value) => typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : value;
  const selectPolicy = result?.policy_contracts?.quote_save_idempotency_select_own;
  const insertPolicy = result?.policy_contracts?.quote_save_idempotency_insert_own;
  const policiesExact = Number(result?.policy_count) === 2
    && JSON.stringify(selectPolicy?.roles) === JSON.stringify(["authenticated"])
    && selectPolicy?.cmd === "SELECT"
    && normalizeExpression(selectPolicy?.qual) === "(( SELECT auth.uid() AS uid) = actor_id)"
    && selectPolicy?.with_check === null
    && JSON.stringify(insertPolicy?.roles) === JSON.stringify(["authenticated"])
    && insertPolicy?.cmd === "INSERT"
    && insertPolicy?.qual === null
    && normalizeExpression(insertPolicy?.with_check) === "((( SELECT auth.uid() AS uid) = actor_id) AND (EXISTS ( SELECT 1 FROM quotes q WHERE ((q.id = quote_save_idempotency.quote_id) AND (q.seller_id = ( SELECT auth.uid() AS uid))))))";
  const constraintContracts = result?.constraint_contracts;
  const constraintsExact = constraintContracts
    && Object.keys(constraintContracts).length === 4
    && constraintContracts.quote_save_idempotency_actor_id_fkey
      === "FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE"
    && constraintContracts.quote_save_idempotency_payload_hash_check
      === "CHECK ((length(payload_hash) = ANY (ARRAY[32, 64])))"
    && constraintContracts.quote_save_idempotency_pkey
      === "PRIMARY KEY (actor_id, idempotency_key)"
    && constraintContracts.quote_save_idempotency_quote_id_fkey
      === "FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE";
  const triggerDefinitionExact = result?.notification_trigger_definition
    === "CREATE TRIGGER trg_notify_singular_quote_submission AFTER UPDATE OF status ON public.quotes FOR EACH ROW EXECUTE FUNCTION notify_singular_quote_submission()";
  const valid = result?.table_exists && result.rls_enabled && result.exact_function_exists
    && result.security_invoker && result.safe_search_path && sourceHashesValid
    && result.authenticated_can_execute
    && !result.anon_can_execute && !result.public_can_execute && result.can_select && result.can_insert
    && !result.can_update && !result.can_delete && policiesExact
    && result.select_policy_safe && result.insert_policy_safe && result.primary_key_exists
    && result.actor_fk_exists && result.quote_fk_exists && result.hash_constraint_exists && constraintsExact
    && result.status_security_safe && result.status_authenticated_execute
    && !result.status_anon_execute && !result.status_public_execute
    && !result.transition_assert_authenticated_execute
    && !result.transition_assert_anon_execute && !result.transition_assert_public_execute
    && !result.notification_authenticated_execute && !result.notification_anon_execute
    && !result.notification_public_execute
    && result.notification_trigger_safe && triggerDefinitionExact;
  if (!valid) {
    const { idempotency_source: _idempotency, status_source: _status,
      notification_source: _notification, ...diagnostic } = result ?? {};
    throw new Error(`Contrato remoto de idempotência inválido: ${JSON.stringify({
      ...diagnostic,
      source_hashes_valid: sourceHashesValid,
      policies_exact: policiesExact,
      constraints_exact: constraintsExact,
      trigger_definition_exact: triggerDefinitionExact,
    })}`);
  }
}

export function buildManagementApiBatch(targets, before) {
  const currentRows = targets
    .filter((target) => before.has(target.version))
    .map((target) => {
      const row = before.get(target.version);
      return { version: row.version, name: row.name, statements: row.statements };
    });
  const versions = targets.map((target) => dollarQuote(target.version, "version")).join(", ");
  const expectedState = dollarQuote(JSON.stringify(currentRows), "expected_state");
  const pending = targets.filter((target) => !before.has(target.version));
  const migrations = pending.map((target) => `
${target.sql}
INSERT INTO supabase_migrations.schema_migrations(version, statements, name)
VALUES (
  ${dollarQuote(target.version, "ledger_version")},
  ARRAY[${dollarQuote(target.sql, "ledger_sql")}]::text[],
  ${dollarQuote(target.name, "ledger_name")}
);`).join("\n");
  const idempotencyMigration = targets.find((target) => target.version === "20260928173500");
  const statusMigration = targets.find((target) => target.version === "20260928182000");
  if (!idempotencyMigration || !statusMigration) {
    throw new Error("Allowlist incompleta para montar a validação transacional.");
  }
  const idempotencyBody = dollarQuote(
    extractFunctionBody(idempotencyMigration.sql, "save_quote_atomic_idempotent"),
    "idempotency_body",
  );
  const statusBody = dollarQuote(
    extractFunctionBody(statusMigration.sql, "bulk_update_quote_status_atomic"),
    "status_body",
  );
  const notificationBody = dollarQuote(
    extractFunctionBody(statusMigration.sql, "notify_singular_quote_submission"),
    "notification_body",
  );

  return `BEGIN;
SET LOCAL statement_timeout = '2min';
SELECT pg_advisory_xact_lock(hashtext('sicoob-allowlisted-migrations'));
DO $sicoob_state_guard$
BEGIN
  IF (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'version', version,
        'name', name,
        'statements', statements
      ) ORDER BY version),
      '[]'::jsonb
    )
    FROM supabase_migrations.schema_migrations
    WHERE version = ANY(ARRAY[${versions}]::text[])
  ) IS DISTINCT FROM ${expectedState}::jsonb THEN
    RAISE EXCEPTION 'O ledger mudou depois do preflight; lote cancelado.';
  END IF;
END;
$sicoob_state_guard$;
${migrations}
DO $sicoob_contract_guard$
BEGIN
  IF to_regclass('public.quote_save_idempotency') IS NULL
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.quote_save_idempotency'::regclass)
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)'))
        IS DISTINCT FROM ${idempotencyBody}
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)'))
        IS DISTINCT FROM ${statusBody}
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.notify_singular_quote_submission()'))
        IS DISTINCT FROM ${notificationBody}
     OR NOT has_function_privilege('authenticated', 'public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)')
         AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     )
     OR NOT has_function_privilege('authenticated', 'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')
         AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     )
     OR has_function_privilege('authenticated', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')
         AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     )
     OR has_function_privilege('authenticated', 'public.notify_singular_quote_submission()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notify_singular_quote_submission()', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = to_regprocedure('public.notify_singular_quote_submission()')
         AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.quotes'::regclass
         AND tgname = 'trg_notify_singular_quote_submission'
         AND NOT tgisinternal
         AND tgenabled = 'O'
     ) THEN
    RAISE EXCEPTION 'O contrato crítico não foi produzido; lote cancelado.';
  END IF;
END;
$sicoob_contract_guard$;
COMMIT;`;
}

async function main() {
  const mode = process.argv[2];
  if (!new Set(["--verify-files", "--check", "--apply", "--require-applied"]).has(mode)) {
    throw new Error("Uso: apply-sicoob-migrations.mjs --verify-files|--check|--apply|--require-applied");
  }

  const targets = loadAuthorizedTargets();
  if (mode === "--verify-files") {
    console.log(JSON.stringify({
      project_ref: PROJECT_REF,
      authorized: targets.map(({ version, name, sha256: hash }) => ({ version, name, sha256: hash })),
      mutation: false,
    }, null, 2));
    return;
  }

  validateGitHubRef();
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    process.env.SUPABASE_DB_URL = validateEnvironment(process.env.SUPABASE_DB_URL);
  }
  const client = await createSupabaseSqlClient({
    projectRef: PROJECT_REF,
    readOnly: mode !== "--apply",
    applicationName: "sicoob-allowlisted-migrations",
  });

  await client.connect();
  try {
    const before = await readApplied(client, targets);
    validateLedger(targets, before);
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
      await validateContract(client, targets);
      console.log("Contrato e ledger das migrations autorizadas estão reconciliados.");
      return;
    }

    if (client.transport === "management-api") {
      if (pending.length) {
        await client.query(buildManagementApiBatch(targets, before));
      } else {
        console.log("Todas as migrations autorizadas já estavam aplicadas; nenhuma escrita executada.");
      }
    } else {
      await client.query("BEGIN");
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('sicoob-allowlisted-migrations'))");
        const current = await readApplied(client, targets);
        validateLedger(targets, current);
        for (const target of targets) {
          if (current.has(target.version)) {
            console.log(`Migration ${target.version} já registrada; nenhuma escrita executada.`);
            continue;
          }
          await client.query(target.sql);
          await client.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, statements, name)
             VALUES ($1, $2::text[], $3)`,
            [target.version, [target.sql], target.name],
          );
          console.log(`Migration ${target.version} preparada na transação allowlisted.`);
        }
        const prepared = await readApplied(client, targets);
        validateLedger(targets, prepared);
        await validateContract(client, targets);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    const after = await readApplied(client, targets);
    validateLedger(targets, after);
    const missing = targets.filter((target) => !after.has(target.version));
    if (missing.length) throw new Error(`Ledger não registrou: ${missing.map((item) => item.version).join(", ")}`);
    await validateContract(client, targets);
    console.log("Aplicação allowlisted concluída; contrato remoto validado.");
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[migrations] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
