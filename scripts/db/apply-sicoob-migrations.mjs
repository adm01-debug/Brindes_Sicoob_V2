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
const LEDGER_HASH_MARKER = /^sha256:([a-f0-9]{64}); executor:allowlisted-management-api$/;
const TARGETS = [
  {
    file: "supabase/migrations/20260928140600_rls_deny_all_internal_tables.sql",
    sha256: "00a3379cc3a0a5942c193b55e9e98a5d29bb70ec9bfd8b085a6b6461dddcedf3",
  },
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
  {
    file: "supabase/migrations/20261002160000_quote_items_id_format_validation.sql",
    sha256: "08426b1a05f7af3421035408d3d02d72d5a23d9c3261bdb2c9c6af8cb1621d73",
  },
  {
    file: "supabase/migrations/20261007212428_remove_obsolete_admin_audit_crons.sql",
    sha256: "1300c79473d64da3513453d61ab876914bc871e67e0a808a9cece0266b011696",
  },
  {
    file: "supabase/migrations/20261007214000_harden_remaining_function_search_paths.sql",
    sha256: "f2a64d01abbd63c2de231fbba6640742bc5ea69e2a108b88269963a65d289811",
  },
  {
    file: "supabase/migrations/20261007220500_revoke_anon_security_helper_execute.sql",
    sha256: "9f1b97bccc4e58b04c23c81db3858d772b4bec89c1804d84674157bf9a202e15",
  },
  {
    file: "supabase/migrations/20261007223000_consolidate_mcp_api_key_audit_triggers.sql",
    sha256: "34f0808a6652910272d7b6149c27662f539aad60daff8c699fc0427319480ab4",
  },
  {
    file: "supabase/migrations/20261007230000_optimize_foreign_keys_and_duplicate_indexes.sql",
    sha256: "3384be5a4f330beae08085e075932c575043337f956a35355aadc14c146e29c1",
  },
  {
    file: "supabase/migrations/20261007231500_optimize_rls_auth_initplans.sql",
    sha256: "dea4699031202f9585e8f5a719f2aa18902a4a7102c1a5f4d4a679dd69862aae",
  },
  {
    file: "supabase/migrations/20261007233000_consolidate_permissive_rls_policies.sql",
    sha256: "0569dcbf761e9362c99cf54692d1e8ed45d6c7507c928dedb573a48519f1ed07",
  },
  {
    file: "supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql",
    sha256: "4783e63b4fc12fd2800331278f81863263719d5cd7db235e86daf07c243bb6b8",
  },
  {
    file: "supabase/migrations/20261008023000_fix_profiles_update_rls_recursion.sql",
    sha256: "75cac09536a3d6a6f8c4a9bcd63705bdc3df2ca4429522c3bb50e6757710cbf3",
  },
  {
    file: "supabase/migrations/20261008030000_fix_sicoob_admin_audit_system_actor.sql",
    sha256: "9d0b40769b2098ebe6c3495db62010456a6fbe4dcb0013a17e8c5b2f08547b4b",
  },
  {
    file: "supabase/migrations/20261008043000_fix_anon_rls_and_semantic_ranking.sql",
    sha256: "cd03ea4e602b78c56053bfe2af3817658a6d45dca03f8fa0cb52250177cda030",
  },
  {
    file: "supabase/migrations/20261008123000_fix_favorite_items_upsert_conflict.sql",
    sha256: "79496a33511eb0fcba9704b41ec97b33622e4b1afaebab6124767f1cd84b2ee6",
  },
  {
    file: "supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql",
    sha256: "0d19bd952c97dd5482f9e4dc4c8656812a868845a2957f07464f406af257053b",
  },
  {
    file: "supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql",
    sha256: "4bc1b931436c5ee412f07d45878a22912f4f79e80136129f75924d9641507e3f",
  },
  {
    file: "supabase/migrations/20261013123000_preserve_atomic_quote_save_under_governance.sql",
    sha256: "0d41715a7eb8e77ff4406ce640647bc2687ab8ca3e2e6d0468e72ca1a8c0f3d0",
  },
  {
    file: "supabase/migrations/20261013150000_catalog_marketing_taxonomy.sql",
    sha256: "5aa4ea56e3a72c0be06d0942a679b075b0d46229fff1f172e1fac8fbf2ba7306",
  },
  {
    file: "supabase/migrations/20261014113000_raise_postgrest_schema_cache_timeout.sql",
    sha256: "a36ad6e9c5fee9a910453dbf1c6fb0729c6126cfef10570a4c08b8af50bd53b3",
  },
  {
    file: "supabase/migrations/20261014121500_separate_postgrest_cache_and_request_timeouts.sql",
    sha256: "5f12ed1add8ca141b9a6568951571439c13c765817d85910dba21d2524d1a289",
  },
  {
    file: "supabase/migrations/20261014124500_canonicalize_quote_insert_timestamps.sql",
    sha256: "5a6aa6ee442f351ea470d5eb6d1652077764f5716848e75bd33820f0e57c06e4",
  },
  {
    file: "supabase/migrations/20261014151000_harden_catalog_marketing_authorship.sql",
    sha256: "f34673b492a9d222c955bed53d396121473fdbd1a32dba2e3fde3f3041f96803",
  },
  {
    file: "supabase/migrations/20261015230500_reconcile_search_analytics_telemetry.sql",
    sha256: "df24ac086477a0672a305a7eca6a08603e1594faf870053a25c6ba5271d31f75",
  },
  {
    file: "supabase/migrations/20261015233500_restrict_search_analytics_grants.sql",
    sha256: "f2f495fca56a53597fa5d9f0aa63c0f47a7ecb05679453b7093abf2ffba99f04",
  },
  {
    file: "supabase/migrations/20261015235000_consolidate_search_analytics_select_policy.sql",
    sha256: "69848af7469db6e9fd360afea19db08ecf2dfdf45e83c3be10402c04502a5757",
  },
  {
    file: "supabase/migrations/20261015235500_search_analytics_legacy_insert_compatibility.sql",
    sha256: "715570bc8424a073e6fb8d78bf7e4f364bb89c46f354241d2ef359fa91e5b3a4",
  },
  {
    file: "supabase/migrations/20261016000000_assert_search_analytics_contract.sql",
    sha256: "1fe51b07889b172928733519a16c773f7e999ed079e4c389dc82168fbcb4f3bb",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// Remove comentários, literais e corpos dollar-quoted para inspecionar só os
// statements de nível superior: o lote management-api executa tudo numa única
// transação, então qualquer controle transacional na migration (incluindo as
// formas estendidas END, ABORT, START TRANSACTION e COMMIT WORK/AND CHAIN ou o
// comando no meio de uma linha) quebraria a promessa de aplicação atômica.
function stripNonCode(sql) {
  let result = "";
  let index = 0;
  while (index < sql.length) {
    const char = sql[index];
    const pair = sql.slice(index, index + 2);
    if (pair === "--") {
      const next = sql.indexOf("\n", index);
      index = next < 0 ? sql.length : next + 1;
      continue;
    }
    if (pair === "/*") {
      const end = sql.indexOf("*/", index + 2);
      index = end < 0 ? sql.length : end + 2;
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) { index += 2; continue; }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    const dollarTag = sql.slice(index).match(/^\$[A-Za-z_]*[A-Za-z0-9_]*\$/);
    if (dollarTag) {
      const tag = dollarTag[0];
      const end = sql.indexOf(tag, index + tag.length);
      index = end < 0 ? sql.length : end + tag.length;
      continue;
    }
    result += char;
    index += 1;
  }
  return result;
}

export function hasTransactionControl(sql) {
  return stripNonCode(sql).split(";").some((statement) => {
    const head = statement.trimStart().toUpperCase();
    if (/^(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|ABORT)\b/.test(head)) return true;
    // END como comando (abreviação de COMMIT): END, END WORK, END TRANSACTION,
    // END AND [NO] CHAIN — só pode aparecer solto no nível superior.
    return /^END(\s+(WORK|TRANSACTION|AND|NO|CHAIN)\b)*\s*$/.test(head);
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

// A migration autorizada mais recente que redefine a função é a fonte do corpo
// esperado: funções forward-only podem ser substituídas por migrations novas
// sem que o arquivo antigo deixe de constar no ledger.
function latestDefiner(targets, functionName) {
  const declarations = [
    `CREATE OR REPLACE FUNCTION public.${functionName}(`,
    `CREATE FUNCTION public.${functionName}(`,
  ];
  return [...targets].reverse().find((target) =>
    declarations.some((declaration) => target.sql.includes(declaration)));
}

function extractFunctionBody(sql, functionName) {
  const declarations = [
    `CREATE OR REPLACE FUNCTION public.${functionName}(`,
    `CREATE FUNCTION public.${functionName}(`,
  ];
  const declarationIndex = declarations
    .map((declaration) => sql.indexOf(declaration))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
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

export function validateLedger(targets, applied) {
  for (const target of targets) {
    const row = applied.get(target.version);
    if (!row) continue;
    if (row.name !== target.name) {
      throw new Error(`Nome divergente no ledger para ${target.version}: ${row.name}.`);
    }
    if (!Array.isArray(row.statements)) {
      throw new Error(`Statements ausentes no ledger para ${target.version}.`);
    }
    const hashMarker = row.statements.length === 1
      ? LEDGER_HASH_MARKER.exec(row.statements[0].trim())
      : null;
    if (hashMarker) {
      if (hashMarker[1] !== target.sha256) {
        throw new Error(`Conteúdo divergente no ledger para ${target.version}.`);
      }
      continue;
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
        WHERE p.oid = to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')) AS transition_assert_source,
      (SELECT p.prosrc FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.can_manage_quote_scope(uuid,uuid)')) AS quote_scope_source,
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
      has_function_privilege('service_role', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE') AS transition_assert_service_execute,
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
          AND NOT t.tgisinternal) AS notification_trigger_definition,
      (SELECT p.prosrc FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)')) AS save_atomic_source,
      COALESCE((SELECT NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
        FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)')), false) AS save_atomic_security_safe,
      has_function_privilege('authenticated', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE') AS save_atomic_authenticated_execute,
      has_function_privilege('anon', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE') AS save_atomic_anon_execute,
      COALESCE((SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
        FROM pg_proc p,
          LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)')), false) AS save_atomic_public_execute,
      EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN (
          SELECT to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)') AS oid
          UNION ALL SELECT to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)')
          UNION ALL SELECT to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')
          UNION ALL SELECT to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')
          UNION ALL SELECT to_regprocedure('public.notify_singular_quote_submission()')
        ) AS sig ON sig.oid = p.oid,
        LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.privilege_type = 'EXECUTE'
          AND a.grantee <> p.proowner
          AND COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantee), 'PUBLIC')
              NOT IN ('authenticated', 'service_role')
      ) AS foreign_execute_granted,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY(ARRAY[
            'bitrix_clients', 'bitrix_deals', 'bitrix_sync_logs',
            'order_duplicate_requests', 'quote_approval_evidence_keys',
            'sicoob_approval_deliveries', 'sicoob_approval_delivery_archive',
            'sicoob_approval_worker_dispatches', 'webhook_configs'
          ])
          AND policyname = 'deny_non_service_role'
          AND permissive = 'RESTRICTIVE'
          AND roles = ARRAY['public']::name[]
          AND cmd = 'ALL'
          AND qual = 'false') AS internal_deny_policy_count,
      (SELECT count(*) FROM cron.job
        WHERE jobname IN ('archive-old-admin-audit-logs', 'trim-connection-test-history')) AS obsolete_cron_count,
      to_regprocedure('public.archive_old_admin_audit_logs()') IS NULL AS archive_function_removed,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.connection_test_history'::regclass
          AND tgname = 'trg_trim_connection_test_history'
          AND NOT tgisinternal
          AND tgenabled = 'O'
      ) AS trim_trigger_safe,
      (SELECT count(*)
        FROM pg_proc AS p
        WHERE p.oid = ANY (ARRAY[
          'public.handle_updated_at()'::regprocedure,
          'public.sync_is_active_with_deleted_at()'::regprocedure,
          'public.determine_sicoob_order_flow_status()'::regprocedure,
          'public.update_notification_updated_at()'::regprocedure
        ]::oid[])
          AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
      ) AS hardened_search_path_count,
      (SELECT count(*)
        FROM pg_trigger
        WHERE tgrelid = 'public.mcp_api_keys'::regclass
          AND tgname = ANY(ARRAY[
            'trg_audit_mcp_key_insert',
            'trg_audit_mcp_key_revoke',
            'trg_log_mcp_key_changes'
          ])
          AND NOT tgisinternal
      ) AS legacy_mcp_audit_trigger_count,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.mcp_api_keys'::regclass
          AND tgname = 'trg_audit_mcp_api_keys'
          AND NOT tgisinternal
          AND tgenabled = 'O'
      ) AS canonical_mcp_audit_trigger_enabled,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.mcp_api_keys'::regclass
          AND tgname = 'trg_guard_mcp_api_keys'
          AND NOT tgisinternal
          AND tgenabled = 'O'
      ) AS mcp_write_guard_enabled,
      (SELECT count(*)
        FROM unnest(ARRAY[
          'public.idx_bitrix_sync_logs_synced_by',
          'public.idx_password_reset_requests_reviewed_by',
          'public.idx_password_reset_requests_user_id',
          'public.idx_quote_approval_tokens_signature_key_id',
          'public.idx_quote_save_idempotency_quote_id',
          'public.idx_sicoob_approval_delegations_pa_id',
          'public.idx_sicoob_approval_delegations_revoked_by',
          'public.idx_sicoob_approval_deliveries_supersedes_delivery',
          'public.idx_sicoob_approval_requests_delegation',
          'public.idx_sicoob_approval_requests_delegator',
          'public.idx_sicoob_document_registry_order_id',
          'public.idx_sicoob_document_registry_uploaded_by',
          'public.idx_sicoob_invitations_access_revoked_by',
          'public.idx_sicoob_invitations_revoked_by',
          'public.idx_sicoob_invitations_superseded_by',
          'public.idx_sicoob_shipments_photo_uploaded_by',
          'public.idx_sicoob_reorder_requests_quote_id'
        ]::text[]) AS expected(index_name)
        WHERE to_regclass(expected.index_name) IS NOT NULL
      ) AS covered_fk_index_count,
      (SELECT count(*)
        FROM unnest(ARRAY[
          'public.idx_admin_audit_log_y2026_m05_created_at',
          'public.idx_admin_audit_log_y2026_m06_created_at',
          'public.idx_invoices_order',
          'public.idx_profiles_cooperativa',
          'public.idx_profiles_pa',
          'public.idx_personalizations_item',
          'public.idx_fk_sicoob_delivery_allocations_order_item_id_fkey',
          'public.idx_fk_sicoob_delivery_destinations_pa_id_fkey',
          'public.idx_fk_sicoob_delivery_receipt_events_received_by_fkey'
        ]::text[]) AS obsolete(index_name)
        WHERE to_regclass(obsolete.index_name) IS NOT NULL
      ) AS obsolete_duplicate_index_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
            COALESCE(qual, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
            OR COALESCE(with_check, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
          )
          AND CONCAT_WS(' ', qual, with_check) !~* 'select\\s+auth\\.(uid|role|jwt)\\(\\)'
      ) AS rls_auth_initplan_candidate_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
      ) AS consolidated_rls_policy_count,
      (SELECT count(DISTINCT tablename)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
      ) AS consolidated_rls_table_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
          AND roles = ARRAY['public']::name[]
      ) AS consolidated_rls_public_policy_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
          AND roles = ARRAY['authenticated', 'service_role']::name[]
      ) AS consolidated_rls_protected_policy_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
          AND (
            permissive <> 'PERMISSIVE'
            OR NOT (
              roles = ARRAY['public']::name[]
              OR roles = ARRAY['authenticated', 'service_role']::name[]
            )
            OR cmd = 'ALL'
          )
      ) AS invalid_consolidated_rls_policy_count,
      (SELECT count(DISTINCT pol.oid)
        FROM pg_policy AS pol
        JOIN pg_class AS cls ON cls.oid = pol.polrelid
        JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
        JOIN pg_depend AS dep
          ON dep.classid = 'pg_policy'::regclass
         AND dep.objid = pol.oid
         AND dep.refclassid = 'pg_proc'::regclass
        JOIN pg_proc AS proc ON proc.oid = dep.refobjid
        WHERE ns.nspname = 'public'
          AND 0 = ANY (pol.polroles)
          AND NOT has_function_privilege('anon', proc.oid, 'EXECUTE')
      ) AS anon_blocked_rls_dependency_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname = ANY (ARRAY[
            'sicoob_anon_cms_banners_select',
            'sicoob_anon_cms_sections_select',
            'sicoob_anon_newsletter_insert',
            'sicoob_anon_product_categories_select'
          ])
          AND roles = ARRAY['anon']::name[]
          AND permissive = 'PERMISSIVE'
      ) AS explicit_anon_policy_count,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sicoob_rls_audit_logs'
      ) AS audit_rls_policy_count,
      EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sicoob_rls_audit_logs'
          AND policyname = 'Devs consultam auditoria RLS'
          AND roles = ARRAY['authenticated']::name[]
          AND cmd = 'SELECT'
          AND qual LIKE '%can_view_audit_logs%'
      ) AS audit_rls_policy_safe,
      NOT has_table_privilege('anon', 'public.sicoob_rls_audit_logs', 'SELECT')
        AS audit_anon_select_revoked,
      EXISTS (
        SELECT 1
        FROM pg_trigger AS t
        JOIN pg_proc AS p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.catalog_marketing_terms'::regclass
          AND t.tgname = 'preserve_catalog_marketing_term_authorship'
          AND NOT t.tgisinternal
          AND t.tgenabled = 'O'
          AND p.proname = 'preserve_catalog_marketing_term_authorship'
          AND NOT p.prosecdef
          AND p.proconfig @> ARRAY['search_path=""']::text[]
          AND p.prosrc LIKE '%NEW.created_by IS DISTINCT FROM OLD.created_by%'
          AND p.prosrc LIKE '%NEW.updated_by := (SELECT auth.uid())%'
          AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
          AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
      ) AS marketing_authorship_trigger_safe,
      EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'catalog_marketing_terms'
          AND policyname = 'Curadores inserem termos de marketing'
          AND roles = ARRAY['authenticated']::name[]
          AND cmd = 'INSERT'
          AND with_check LIKE '%created_by%auth.uid()%'
      ) AS marketing_insert_authorship_safe,
      COALESCE((SELECT
          p.prosecdef
          AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
          AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
          AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
          AND has_function_privilege('service_role', p.oid, 'EXECUTE')
          AND p.prosrc LIKE '%ORDER BY ranked.score DESC%'
        FROM pg_proc AS p
        WHERE p.oid = to_regprocedure(
          'public.search_products_semantic(text,jsonb,integer)'
        )), false) AS semantic_search_contract_safe,
      EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'pa_budgets'
          AND policyname = 'pa_budgets_anon_deny'
          AND permissive = 'RESTRICTIVE'
          AND roles = ARRAY['anon']::name[]
          AND cmd = 'ALL'
          AND qual = 'false'
          AND with_check = 'false'
      ) AS pa_budgets_restrictive_policy_safe,
      EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.favorite_items'::regclass
          AND conname = 'favorite_items_list_product_variant_key'
          AND contype = 'u'
          AND pg_get_constraintdef(oid)
            = 'UNIQUE NULLS NOT DISTINCT (list_id, product_id, variant_id)'
      ) AS favorite_items_upsert_constraint_safe,
      to_regclass('public.idx_favorite_items_unique') IS NULL
        AS favorite_items_legacy_index_removed,
      to_regclass('public.search_analytics') IS NOT NULL
        AND COALESCE((SELECT c.relrowsecurity
          FROM pg_class AS c
          WHERE c.oid = to_regclass('public.search_analytics')), false)
        AS search_analytics_table_safe,
      (SELECT p.prosrc
        FROM pg_proc AS p
        WHERE p.oid = to_regprocedure('public.normalize_search_analytics_insert()'))
        AS search_normalizer_source,
      COALESCE((SELECT
          NOT p.prosecdef
          AND p.prorettype = 'pg_catalog.trigger'::regtype
          AND p.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
          AND l.lanname = 'plpgsql'
        FROM pg_proc AS p
        JOIN pg_language AS l ON l.oid = p.prolang
        WHERE p.oid = to_regprocedure(
          'public.normalize_search_analytics_insert()'
        )), false) AS search_normalizer_security_safe,
      COALESCE(NOT has_function_privilege(
        'anon', to_regprocedure('public.normalize_search_analytics_insert()'), 'EXECUTE'
      ), false)
        AND COALESCE(NOT has_function_privilege(
          'authenticated', to_regprocedure('public.normalize_search_analytics_insert()'), 'EXECUTE'
        ), false)
        AND NOT EXISTS (
          SELECT 1
          FROM pg_proc AS p,
            LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
          WHERE p.oid = to_regprocedure('public.normalize_search_analytics_insert()')
            AND acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        ) AS search_normalizer_execute_safe,
      EXISTS (
        SELECT 1
        FROM pg_trigger AS t
        WHERE t.tgrelid = to_regclass('public.search_analytics')
          AND t.tgname = 'trg_normalize_search_analytics_insert'
          AND NOT t.tgisinternal
          AND t.tgenabled = 'O'
          AND t.tgtype = 7
          AND t.tgfoid = to_regprocedure('public.normalize_search_analytics_insert()')
      ) AS search_normalizer_trigger_safe,
      (SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'search_analytics')
        AS search_policy_count,
      EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'search_analytics'
          AND policyname = 'Users insert own search analytics'
          AND permissive = 'PERMISSIVE'
          AND roles = ARRAY['authenticated']::name[]
          AND cmd = 'INSERT'
          AND qual IS NULL
          AND regexp_replace(
            replace(with_check, 'auth.', ''), '[[:space:]]+', '', 'g'
          ) = '(((SELECTuid()ASuid)ISNOTNULL)AND((SELECTuid()ASuid)=user_id))'
      ) AS search_insert_policy_safe,
      EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'search_analytics'
          AND policyname = 'Authorized users read search analytics'
          AND permissive = 'PERMISSIVE'
          AND roles = ARRAY['authenticated']::name[]
          AND cmd = 'SELECT'
          AND regexp_replace(
            replace(replace(qual, 'auth.', ''), 'public.', ''),
            '[[:space:]]+', '', 'g'
          ) = '(((SELECTuid()ASuid)ISNOTNULL)AND(((SELECTuid()ASuid)=user_id)OR(SELECTis_manager_or_admin()ASis_manager_or_admin)))'
          AND with_check IS NULL
      ) AS search_select_policy_safe,
      (SELECT count(*) = 3
        FROM pg_policy AS p
        JOIN pg_depend AS d
          ON d.classid = 'pg_policy'::regclass
         AND d.objid = p.oid
         AND d.refclassid = 'pg_proc'::regclass
        WHERE p.polrelid = to_regclass('public.search_analytics')
          AND (
            (p.polname = 'Users insert own search analytics'
              AND d.refobjid = to_regprocedure('auth.uid()'))
            OR (p.polname = 'Authorized users read search analytics'
              AND d.refobjid IN (
                to_regprocedure('auth.uid()'),
                to_regprocedure('public.is_manager_or_admin()')
              ))
          )) AS search_policy_dependencies_safe,
      has_table_privilege('authenticated', 'public.search_analytics', 'SELECT')
        AND has_table_privilege('authenticated', 'public.search_analytics', 'INSERT')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'UPDATE')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'DELETE')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'TRUNCATE')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'REFERENCES')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'TRIGGER')
        AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'MAINTAIN')
        AND NOT has_table_privilege(
          'anon', 'public.search_analytics',
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
        ) AS search_effective_grants_safe,
      (SELECT COALESCE(
          array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
          ARRAY[]::text[]
        ) = ARRAY['INSERT', 'SELECT']::text[]
        FROM pg_class AS c,
          LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
        WHERE c.oid = to_regclass('public.search_analytics')
          AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated'))
        AND (SELECT COALESCE(
          array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
          ARRAY[]::text[]
        ) = ARRAY[
          'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
        ]::text[]
        FROM pg_class AS c,
          LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
        WHERE c.oid = to_regclass('public.search_analytics')
          AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'service_role'))
        AND NOT EXISTS (
          SELECT 1
          FROM pg_class AS c,
            LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
          WHERE c.oid = to_regclass('public.search_analytics')
            AND acl.grantee IN (
              0,
              (SELECT oid FROM pg_roles WHERE rolname = 'anon')
            )
        ) AS search_direct_acl_safe
  `);
  const result = rows[0];
  const idempotencyMigration = latestDefiner(targets, "save_quote_atomic_idempotent");
  const statusMigration = latestDefiner(targets, "bulk_update_quote_status_atomic");
  const notificationMigration = latestDefiner(targets, "notify_singular_quote_submission");
  const identityMigration = latestDefiner(targets, "save_quote_atomic");
  const transitionMigration = latestDefiner(targets, "assert_quote_transition");
  const quoteScopeMigration = latestDefiner(targets, "can_manage_quote_scope");
  const searchNormalizerMigration = latestDefiner(targets, "normalize_search_analytics_insert");
  if (!idempotencyMigration || !statusMigration || !notificationMigration || !identityMigration
      || !transitionMigration || !quoteScopeMigration || !searchNormalizerMigration) {
    throw new Error("Allowlist incompleta para validar os corpos das funções críticas.");
  }
  const sourceHashesValid = typeof result?.idempotency_source === "string"
    && typeof result.status_source === "string"
    && typeof result.notification_source === "string"
    && typeof result.save_atomic_source === "string"
    && typeof result.transition_assert_source === "string"
    && typeof result.quote_scope_source === "string"
    && typeof result.search_normalizer_source === "string"
    && sha256(result.idempotency_source.trim()) === sha256(
      extractFunctionBody(idempotencyMigration.sql, "save_quote_atomic_idempotent"),
    )
    && sha256(result.status_source.trim()) === sha256(
      extractFunctionBody(statusMigration.sql, "bulk_update_quote_status_atomic"),
    )
    && sha256(result.notification_source.trim()) === sha256(
      extractFunctionBody(notificationMigration.sql, "notify_singular_quote_submission"),
    )
    && sha256(result.save_atomic_source.trim()) === sha256(
      extractFunctionBody(identityMigration.sql, "save_quote_atomic"),
    )
    && sha256(result.transition_assert_source.trim()) === sha256(
      extractFunctionBody(transitionMigration.sql, "assert_quote_transition"),
    )
    && sha256(result.quote_scope_source.trim()) === sha256(
      extractFunctionBody(quoteScopeMigration.sql, "can_manage_quote_scope"),
    )
    && sha256(result.search_normalizer_source.trim()) === sha256(
      extractFunctionBody(searchNormalizerMigration.sql, "normalize_search_analytics_insert"),
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
    && !result.transition_assert_anon_execute && !result.transition_assert_service_execute
    && !result.transition_assert_public_execute
    && !result.notification_authenticated_execute && !result.notification_anon_execute
    && !result.notification_public_execute
    && result.notification_trigger_safe && triggerDefinitionExact
    && result.save_atomic_security_safe && result.save_atomic_authenticated_execute
    && !result.save_atomic_anon_execute && !result.save_atomic_public_execute
    && !result.foreign_execute_granted
    && Number(result.internal_deny_policy_count) === 9
    && Number(result.obsolete_cron_count) === 0
    && result.archive_function_removed
    && result.trim_trigger_safe
    && Number(result.hardened_search_path_count) === 4
    && Number(result.legacy_mcp_audit_trigger_count) === 0
    && result.canonical_mcp_audit_trigger_enabled
    && result.mcp_write_guard_enabled
    && Number(result.covered_fk_index_count) === 17
    && Number(result.obsolete_duplicate_index_count) === 0
    && Number(result.rls_auth_initplan_candidate_count) === 0
    && Number(result.consolidated_rls_policy_count) === 226
    && Number(result.consolidated_rls_table_count) === 63
    && Number(result.consolidated_rls_public_policy_count) === 59
    && Number(result.consolidated_rls_protected_policy_count) === 167
    && Number(result.invalid_consolidated_rls_policy_count) === 0
    && Number(result.anon_blocked_rls_dependency_count) === 0
    && Number(result.explicit_anon_policy_count) === 4
    && Number(result.audit_rls_policy_count) === 1
    && result.audit_rls_policy_safe && result.audit_anon_select_revoked
    && result.marketing_authorship_trigger_safe && result.marketing_insert_authorship_safe
    && result.semantic_search_contract_safe
    && result.pa_budgets_restrictive_policy_safe
    && result.favorite_items_upsert_constraint_safe
    && result.favorite_items_legacy_index_removed
    && result.search_analytics_table_safe
    && result.search_normalizer_security_safe
    && result.search_normalizer_execute_safe
    && result.search_normalizer_trigger_safe
    && Number(result.search_policy_count) === 2
    && result.search_insert_policy_safe
    && result.search_select_policy_safe
    && result.search_policy_dependencies_safe
    && result.search_effective_grants_safe
    && result.search_direct_acl_safe;
  if (!valid) {
    const diagnostic = { ...(result ?? {}) };
    delete diagnostic.idempotency_source;
    delete diagnostic.status_source;
    delete diagnostic.notification_source;
    delete diagnostic.save_atomic_source;
    delete diagnostic.search_normalizer_source;
    throw new Error(`Contrato remoto crítico inválido: ${JSON.stringify({
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
  const idempotencyMigration = latestDefiner(targets, "save_quote_atomic_idempotent");
  const statusMigration = latestDefiner(targets, "bulk_update_quote_status_atomic");
  const notificationMigration = latestDefiner(targets, "notify_singular_quote_submission");
  const identityMigration = latestDefiner(targets, "save_quote_atomic");
  const transitionMigration = latestDefiner(targets, "assert_quote_transition");
  const quoteScopeMigration = latestDefiner(targets, "can_manage_quote_scope");
  const searchNormalizerMigration = latestDefiner(targets, "normalize_search_analytics_insert");
  if (!idempotencyMigration || !statusMigration || !notificationMigration || !identityMigration
      || !transitionMigration || !quoteScopeMigration || !searchNormalizerMigration) {
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
    extractFunctionBody(notificationMigration.sql, "notify_singular_quote_submission"),
    "notification_body",
  );
  const saveAtomicBody = dollarQuote(
    extractFunctionBody(identityMigration.sql, "save_quote_atomic"),
    "save_atomic_body",
  );
  const transitionBody = dollarQuote(
    extractFunctionBody(transitionMigration.sql, "assert_quote_transition"),
    "transition_body",
  );
  const quoteScopeBody = dollarQuote(
    extractFunctionBody(quoteScopeMigration.sql, "can_manage_quote_scope"),
    "quote_scope_body",
  );
  const searchNormalizerBody = dollarQuote(
    extractFunctionBody(searchNormalizerMigration.sql, "normalize_search_analytics_insert"),
    "search_normalizer_body",
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
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)'))
        IS DISTINCT FROM ${saveAtomicBody}
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)'))
        IS DISTINCT FROM ${transitionBody}
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.can_manage_quote_scope(uuid,uuid)'))
        IS DISTINCT FROM ${quoteScopeBody}
     OR (SELECT btrim(prosrc, E' \n\r\t') FROM pg_proc WHERE oid = to_regprocedure('public.normalize_search_analytics_insert()'))
        IS DISTINCT FROM ${searchNormalizerBody}
     OR to_regclass('public.search_analytics') IS NULL
     OR COALESCE((SELECT NOT relrowsecurity
       FROM pg_class WHERE oid = to_regclass('public.search_analytics')), true)
     OR COALESCE((SELECT
       prosecdef
       OR prorettype <> 'pg_catalog.trigger'::regtype
       OR proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
       FROM pg_proc
       WHERE oid = to_regprocedure('public.normalize_search_analytics_insert()')), true)
     OR has_function_privilege('anon', 'public.normalize_search_analytics_insert()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.normalize_search_analytics_insert()', 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM pg_proc AS p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
       WHERE p.oid = to_regprocedure('public.normalize_search_analytics_insert()')
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgrelid = to_regclass('public.search_analytics')
         AND tgname = 'trg_normalize_search_analytics_insert'
         AND NOT tgisinternal
         AND tgenabled = 'O'
         AND tgtype = 7
         AND tgfoid = to_regprocedure('public.normalize_search_analytics_insert()')
     )
     OR (SELECT count(*) FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'search_analytics') <> 2
     OR NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'search_analytics'
         AND policyname = 'Users insert own search analytics'
         AND permissive = 'PERMISSIVE'
         AND roles = ARRAY['authenticated']::name[]
         AND cmd = 'INSERT'
         AND qual IS NULL
         AND regexp_replace(
           replace(with_check, 'auth.', ''), '[[:space:]]+', '', 'g'
         ) = '(((SELECTuid()ASuid)ISNOTNULL)AND((SELECTuid()ASuid)=user_id))'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'search_analytics'
         AND policyname = 'Authorized users read search analytics'
         AND permissive = 'PERMISSIVE'
         AND roles = ARRAY['authenticated']::name[]
         AND cmd = 'SELECT'
         AND regexp_replace(
           replace(replace(qual, 'auth.', ''), 'public.', ''),
           '[[:space:]]+', '', 'g'
         ) = '(((SELECTuid()ASuid)ISNOTNULL)AND(((SELECTuid()ASuid)=user_id)OR(SELECTis_manager_or_admin()ASis_manager_or_admin)))'
         AND with_check IS NULL
     )
     OR (SELECT count(*)
       FROM pg_policy AS p
       JOIN pg_depend AS d
         ON d.classid = 'pg_policy'::regclass
        AND d.objid = p.oid
        AND d.refclassid = 'pg_proc'::regclass
       WHERE p.polrelid = to_regclass('public.search_analytics')
         AND (
           (p.polname = 'Users insert own search analytics'
             AND d.refobjid = to_regprocedure('auth.uid()'))
           OR (p.polname = 'Authorized users read search analytics'
             AND d.refobjid IN (
               to_regprocedure('auth.uid()'),
               to_regprocedure('public.is_manager_or_admin()')
             ))
         )) <> 3
     OR NOT has_table_privilege('authenticated', 'public.search_analytics', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.search_analytics', 'INSERT')
     OR has_table_privilege(
       'authenticated', 'public.search_analytics',
       'UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN'
     )
     OR has_table_privilege(
       'anon', 'public.search_analytics',
       'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
     )
     OR (SELECT COALESCE(
       array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
       ARRAY[]::text[]
       ) FROM pg_class AS c,
         LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
       WHERE c.oid = to_regclass('public.search_analytics')
         AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated'))
       IS DISTINCT FROM ARRAY['INSERT', 'SELECT']::text[]
     OR (SELECT COALESCE(
       array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
       ARRAY[]::text[]
       ) FROM pg_class AS c,
         LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
       WHERE c.oid = to_regclass('public.search_analytics')
         AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'service_role'))
       IS DISTINCT FROM ARRAY[
         'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
       ]::text[]
     OR EXISTS (
       SELECT 1
       FROM pg_class AS c,
         LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
       WHERE c.oid = to_regclass('public.search_analytics')
         AND acl.grantee IN (0, (SELECT oid FROM pg_roles WHERE rolname = 'anon'))
     )
     OR COALESCE((SELECT prosecdef OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
        FROM pg_proc WHERE oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)')), true)
     OR COALESCE((SELECT prosecdef OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
        FROM pg_proc WHERE oid = to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)')), true)
     OR COALESCE((SELECT NOT prosecdef OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
        FROM pg_proc WHERE oid = to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')), true)
     OR COALESCE((SELECT NOT prosecdef OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
        FROM pg_proc WHERE oid = to_regprocedure('public.notify_singular_quote_submission()')), true)
     OR COALESCE((SELECT NOT prosecdef OR NOT (proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
        FROM pg_proc WHERE oid = to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')), true)
     OR EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN (
         SELECT to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)') AS oid
         UNION ALL SELECT to_regprocedure('public.save_quote_atomic_idempotent(jsonb,jsonb,uuid,jsonb)')
         UNION ALL SELECT to_regprocedure('public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)')
         UNION ALL SELECT to_regprocedure('public.assert_quote_transition(uuid,public.quotes,text)')
         UNION ALL SELECT to_regprocedure('public.notify_singular_quote_submission()')
       ) AS sig ON sig.oid = p.oid,
       LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE a.privilege_type = 'EXECUTE'
         AND a.grantee <> p.proowner
         AND COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantee), 'PUBLIC')
             NOT IN ('authenticated', 'service_role')
     )
     OR NOT has_function_privilege('authenticated', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = to_regprocedure('public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)')
         AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     )
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
     OR has_function_privilege('service_role', 'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
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
     )
     OR (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = ANY(ARRAY[
             'bitrix_clients', 'bitrix_deals', 'bitrix_sync_logs',
             'order_duplicate_requests', 'quote_approval_evidence_keys',
             'sicoob_approval_deliveries', 'sicoob_approval_delivery_archive',
             'sicoob_approval_worker_dispatches', 'webhook_configs'
           ])
           AND policyname = 'deny_non_service_role'
           AND permissive = 'RESTRICTIVE'
           AND roles = ARRAY['public']::name[]
           AND cmd = 'ALL'
           AND qual = 'false') <> 9
     OR EXISTS (
       SELECT 1 FROM cron.job
       WHERE jobname IN ('archive-old-admin-audit-logs', 'trim-connection-test-history')
     )
     OR to_regprocedure('public.archive_old_admin_audit_logs()') IS NOT NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.connection_test_history'::regclass
         AND tgname = 'trg_trim_connection_test_history'
         AND NOT tgisinternal
         AND tgenabled = 'O'
     )
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.mcp_api_keys'::regclass
         AND tgname = ANY(ARRAY[
           'trg_audit_mcp_key_insert',
           'trg_audit_mcp_key_revoke',
           'trg_log_mcp_key_changes'
         ])
         AND NOT tgisinternal
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.mcp_api_keys'::regclass
         AND tgname = 'trg_audit_mcp_api_keys'
         AND NOT tgisinternal
         AND tgenabled = 'O'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.mcp_api_keys'::regclass
         AND tgname = 'trg_guard_mcp_api_keys'
         AND NOT tgisinternal
         AND tgenabled = 'O'
     )
     OR (SELECT count(*)
       FROM unnest(ARRAY[
         'public.idx_bitrix_sync_logs_synced_by',
         'public.idx_password_reset_requests_reviewed_by',
         'public.idx_password_reset_requests_user_id',
         'public.idx_quote_approval_tokens_signature_key_id',
         'public.idx_quote_save_idempotency_quote_id',
         'public.idx_sicoob_approval_delegations_pa_id',
         'public.idx_sicoob_approval_delegations_revoked_by',
         'public.idx_sicoob_approval_deliveries_supersedes_delivery',
         'public.idx_sicoob_approval_requests_delegation',
         'public.idx_sicoob_approval_requests_delegator',
         'public.idx_sicoob_document_registry_order_id',
         'public.idx_sicoob_document_registry_uploaded_by',
         'public.idx_sicoob_invitations_access_revoked_by',
         'public.idx_sicoob_invitations_revoked_by',
         'public.idx_sicoob_invitations_superseded_by',
         'public.idx_sicoob_shipments_photo_uploaded_by',
         'public.idx_sicoob_reorder_requests_quote_id'
       ]::text[]) AS expected(index_name)
       WHERE to_regclass(expected.index_name) IS NOT NULL) <> 17
     OR EXISTS (
       SELECT 1
       FROM unnest(ARRAY[
         'public.idx_admin_audit_log_y2026_m05_created_at',
         'public.idx_admin_audit_log_y2026_m06_created_at',
         'public.idx_invoices_order',
         'public.idx_profiles_cooperativa',
         'public.idx_profiles_pa',
         'public.idx_personalizations_item',
         'public.idx_fk_sicoob_delivery_allocations_order_item_id_fkey',
         'public.idx_fk_sicoob_delivery_destinations_pa_id_fkey',
         'public.idx_fk_sicoob_delivery_receipt_events_received_by_fkey'
       ]::text[]) AS obsolete(index_name)
       WHERE to_regclass(obsolete.index_name) IS NOT NULL
     )
     OR EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND (
           COALESCE(qual, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
           OR COALESCE(with_check, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
         )
         AND CONCAT_WS(' ', qual, with_check) !~* 'select\\s+auth\\.(uid|role|jwt)\\(\\)'
     )
     OR (SELECT count(*)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$') <> 226
     OR (SELECT count(DISTINCT tablename)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$') <> 63
     OR (SELECT count(*)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
         AND roles = ARRAY['public']::name[]) <> 59
     OR (SELECT count(*)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
         AND roles = ARRAY['authenticated', 'service_role']::name[]) <> 167
     OR EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
         AND (
           permissive <> 'PERMISSIVE'
           OR NOT (
             roles = ARRAY['public']::name[]
             OR roles = ARRAY['authenticated', 'service_role']::name[]
           )
           OR cmd = 'ALL'
         )
     )
     OR EXISTS (
       SELECT 1
       FROM pg_policy AS pol
       JOIN pg_class AS cls ON cls.oid = pol.polrelid
       JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
       JOIN pg_depend AS dep
         ON dep.classid = 'pg_policy'::regclass
        AND dep.objid = pol.oid
        AND dep.refclassid = 'pg_proc'::regclass
       JOIN pg_proc AS proc ON proc.oid = dep.refobjid
       WHERE ns.nspname = 'public'
         AND 0 = ANY (pol.polroles)
         AND NOT has_function_privilege('anon', proc.oid, 'EXECUTE')
     )
     OR (SELECT count(*)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND policyname = ANY (ARRAY[
           'sicoob_anon_cms_banners_select',
           'sicoob_anon_cms_sections_select',
           'sicoob_anon_newsletter_insert',
           'sicoob_anon_product_categories_select'
         ])
         AND roles = ARRAY['anon']::name[]
         AND permissive = 'PERMISSIVE') <> 4
     OR (SELECT count(*)
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'sicoob_rls_audit_logs') <> 1
     OR NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'sicoob_rls_audit_logs'
         AND policyname = 'Devs consultam auditoria RLS'
         AND roles = ARRAY['authenticated']::name[]
         AND cmd = 'SELECT'
         AND qual LIKE '%can_view_audit_logs%'
     )
     OR has_table_privilege('anon', 'public.sicoob_rls_audit_logs', 'SELECT')
     OR NOT EXISTS (
       SELECT 1
       FROM pg_trigger AS t
       JOIN pg_proc AS p ON p.oid = t.tgfoid
       WHERE t.tgrelid = 'public.catalog_marketing_terms'::regclass
         AND t.tgname = 'preserve_catalog_marketing_term_authorship'
         AND NOT t.tgisinternal
         AND t.tgenabled = 'O'
         AND p.proname = 'preserve_catalog_marketing_term_authorship'
         AND NOT p.prosecdef
         AND p.proconfig @> ARRAY['search_path=""']::text[]
         AND p.prosrc LIKE '%NEW.created_by IS DISTINCT FROM OLD.created_by%'
         AND p.prosrc LIKE '%NEW.updated_by := (SELECT auth.uid())%'
         AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
         AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'catalog_marketing_terms'
         AND policyname = 'Curadores inserem termos de marketing'
         AND roles = ARRAY['authenticated']::name[]
         AND cmd = 'INSERT'
         AND with_check LIKE '%created_by%auth.uid()%'
     )
     OR COALESCE((SELECT
       NOT p.prosecdef
       OR NOT (p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
       OR has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
       OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
       OR p.prosrc NOT LIKE '%ORDER BY ranked.score DESC%'
       FROM pg_proc AS p
       WHERE p.oid = to_regprocedure(
         'public.search_products_semantic(text,jsonb,integer)'
       )), true)
     OR NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'pa_budgets'
         AND policyname = 'pa_budgets_anon_deny'
         AND permissive = 'RESTRICTIVE'
         AND roles = ARRAY['anon']::name[]
         AND cmd = 'ALL'
         AND qual = 'false'
         AND with_check = 'false'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conrelid = 'public.favorite_items'::regclass
         AND conname = 'favorite_items_list_product_variant_key'
         AND contype = 'u'
         AND pg_get_constraintdef(oid)
           = 'UNIQUE NULLS NOT DISTINCT (list_id, product_id, variant_id)'
     )
     OR to_regclass('public.idx_favorite_items_unique') IS NOT NULL THEN
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
