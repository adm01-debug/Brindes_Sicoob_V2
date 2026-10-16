import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261015230500_reconcile_search_analytics_telemetry.sql",
  "utf8",
);
const grantsMigration = readFileSync(
  "supabase/migrations/20261015233500_restrict_search_analytics_grants.sql",
  "utf8",
);
const selectPolicyMigration = readFileSync(
  "supabase/migrations/20261015235000_consolidate_search_analytics_select_policy.sql",
  "utf8",
);
const legacyInsertMigration = readFileSync(
  "supabase/migrations/20261015235500_search_analytics_legacy_insert_compatibility.sql",
  "utf8",
);
const contractMigration = readFileSync(
  "supabase/migrations/20261016000000_assert_search_analytics_contract.sql",
  "utf8",
);
const fixture = readFileSync(
  "tests/scenarios/sql/search-analytics-legacy-compatibility-fixture.sql",
  "utf8",
);
const runner = readFileSync("scripts/qa/simular-search-analytics-legado.py", "utf8");
const migrationApplicator = readFileSync("scripts/db/apply-sicoob-migrations.mjs", "utf8");
const mainWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const sicoobWorkflow = readFileSync(".github/workflows/sicoob-ci.yml", "utf8");

describe("migration de reconciliação da telemetria de busca", () => {
  it("preserva e converte as colunas legadas pelo padrão expand/contract", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS user_id uuid");
    expect(migration).toContain("SET user_id = seller_id");
    expect(migration).toContain("ALTER COLUMN seller_id DROP NOT NULL");
    expect(migration).toContain("SET search_context = filters_used::text");
    expect(migration).not.toMatch(/DROP COLUMN\s+(seller_id|filters_used)/i);
  });

  it("normaliza inserts legados sem confiar na autoria enviada pelo cliente", () => {
    expect(legacyInsertMigration).toContain("ADD COLUMN IF NOT EXISTS seller_id uuid");
    expect(legacyInsertMigration).toContain("ADD COLUMN IF NOT EXISTS filters_used jsonb");
    expect(legacyInsertMigration).toContain("BEFORE INSERT ON public.search_analytics");
    expect(legacyInsertMigration).toContain("v_actor uuid := auth.uid()");
    expect(legacyInsertMigration).toContain("NEW.user_id := v_actor");
    expect(legacyInsertMigration).toContain("NEW.seller_id := v_actor");
    expect(legacyInsertMigration).toContain("NEW.search_context := NEW.filters_used::text");
    expect(legacyInsertMigration).toContain("SECURITY INVOKER");
    expect(legacyInsertMigration).not.toMatch(/SECURITY\s+DEFINER/i);
  });

  it("mantém RLS canônica e inclui asserts de pós-condição na migration transitória", () => {
    expect(legacyInsertMigration).not.toMatch(/(?:DISABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(legacyInsertMigration).not.toMatch(/DROP\s+POLICY/i);
    expect(legacyInsertMigration).toContain("relrowsecurity");
    expect(legacyInsertMigration).toContain("Users insert own search analytics");
    expect(legacyInsertMigration).toContain("NOT prosecdef");
    expect(legacyInsertMigration).toContain("REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM PUBLIC");
  });

  it("certifica trigger, função, policies e ACL em migration forward-only", () => {
    expect(contractMigration).toContain("t.tgenabled = 'O'");
    expect(contractMigration).toContain("t.tgtype = 7");
    expect(contractMigration).toContain("AND t.tgfoid = v_normalizer");
    expect(contractMigration).toContain("AND NOT p.prosecdef");
    expect(contractMigration).toContain(
      "p.proconfig = ARRAY['search_path=pg_catalog, public']::text[]",
    );
    expect(contractMigration).toContain("p.polroles = ARRAY[v_authenticated]");
    expect(contractMigration).toContain("pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid)");
    expect(contractMigration).toContain("pg_catalog.pg_get_expr(p.polqual, p.polrelid)");
    expect(contractMigration).toContain("d.refobjid = 'auth.uid()'::pg_catalog.regprocedure");
    expect(contractMigration).toContain("'public.is_manager_or_admin()'::pg_catalog.regprocedure");
    expect(contractMigration).toContain("acl.grantee IN (0, v_anon)");
    expect(contractMigration).toContain("'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES'");
  });

  it("exercita payload legado, autoria forjada e anon sem depender do termo de busca", () => {
    expect(fixture).toContain("CREATE TEMP TABLE fixture_search_analytics_ids");
    expect(fixture).toContain("RETURNING id");
    expect(fixture).toContain("WHERE fixture.scenario = 'legado'");
    expect(fixture).toContain("WHERE fixture.scenario = 'autoria_canonica_forjada'");
    expect(fixture).toContain("SET LOCAL ROLE anon");
    expect(fixture).toContain("WHEN insufficient_privilege THEN NULL");
    expect(fixture).toContain("ROLLBACK;");
  });

  it("executa o fixture automaticamente em PostgreSQL Supabase descartável", () => {
    expect(runner).toContain("start_supabase_postgres(command, CONTAINER)");
    expect(runner).toContain("FIXTURE.read_text()");
    expect(runner).toContain('checks["fixture_reverte_eventos"]');
    expect(mainWorkflow).toContain("python3 scripts/qa/simular-search-analytics-legado.py");
    expect(sicoobWorkflow).toContain("python3 scripts/qa/simular-search-analytics-legado.py");
  });

  it("certifica o mesmo contrato no preflight e no guard atômico do aplicador", () => {
    expect(migrationApplicator).toContain("AS search_normalizer_trigger_safe");
    expect(migrationApplicator).toContain("AS search_policy_dependencies_safe");
    expect(migrationApplicator).toContain("AS search_direct_acl_safe");
    expect(migrationApplicator).toContain("result.search_normalizer_trigger_safe");
    expect(migrationApplicator).toContain("result.search_policy_dependencies_safe");
    expect(migrationApplicator).toContain("IS DISTINCT FROM ${searchNormalizerBody}");
    expect(migrationApplicator).toContain(
      'file: "supabase/migrations/20261016000000_assert_search_analytics_contract.sql"',
    );
  });

  it("vincula escrita ao usuário autenticado e separa leitura própria e gerencial", () => {
    expect(migration).toContain(
      "WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)",
    );
    expect(migration).toContain(
      "USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)",
    );
    expect(migration).toContain("USING ((SELECT public.is_manager_or_admin()))");
    expect(migration).toContain("REVOKE ALL ON TABLE public.search_analytics FROM anon");
  });

  it("remove privilégios herdados e mantém somente leitura e inserção autenticadas", () => {
    expect(grantsMigration).toContain(
      "REVOKE ALL ON TABLE public.search_analytics FROM authenticated",
    );
    expect(grantsMigration).toContain(
      "GRANT SELECT, INSERT ON TABLE public.search_analytics TO authenticated",
    );
  });

  it("consolida a leitura própria e gerencial em uma única policy permissiva", () => {
    expect(selectPolicyMigration).toContain(
      'DROP POLICY IF EXISTS "Users read own search analytics"',
    );
    expect(selectPolicyMigration).toContain(
      'DROP POLICY IF EXISTS "Managers read search analytics"',
    );
    expect(selectPolicyMigration).toContain(
      'CREATE POLICY "Authorized users read search analytics"',
    );
    expect(selectPolicyMigration).toContain("(SELECT auth.uid()) = user_id");
    expect(selectPolicyMigration).toContain("(SELECT public.is_manager_or_admin())");
  });

  it("indexa os dois cursores globais e os dois cursores por proprietário", () => {
    expect(migration).toContain("(created_at DESC, id DESC)");
    expect(migration).toContain("(user_id, created_at DESC, id DESC)");
    expect(migration).toContain("(seller_id, created_at DESC, id DESC)");
    expect(migration).toContain("WHERE results_count = 0");
  });
});
