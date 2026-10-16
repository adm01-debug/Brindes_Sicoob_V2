"""Valida compatibilidade, autoria e ACL de search_analytics sem rede."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-search-analytics-" + uuid.uuid4().hex[:10]
MIGRATIONS = (
    "20261015230500_reconcile_search_analytics_telemetry.sql",
    "20261015233500_restrict_search_analytics_grants.sql",
    "20261015235000_consolidate_search_analytics_select_policy.sql",
    "20261015235500_search_analytics_legacy_insert_compatibility.sql",
    "20261016000000_assert_search_analytics_contract.sql",
    "20261016160000_validate_search_analytics_payload.sql",
)
FIXTURE = ROOT / "tests/scenarios/sql/search-analytics-legacy-compatibility-fixture.sql"
CONTRACT = ROOT / "supabase/migrations/20261016000000_assert_search_analytics_contract.sql"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        [
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "supabase_admin",
            "-d", "sicoob_simulation", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
        ],
        stdin=statement,
        check=False,
    )
    if check and response.returncode:
        raise RuntimeError(response.stderr.strip())
    return response


checks = {}
try:
    start_supabase_postgres(command, CONTAINER)
    wait_for_postgres(command, CONTAINER)
    command([
        "docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
        "--template=template0", "sicoob_simulation",
    ])
    sql("""
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
      END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE OR REPLACE FUNCTION public.is_manager_or_admin() RETURNS boolean
      LANGUAGE sql STABLE AS $$ SELECT false $$;
      CREATE TABLE public.product_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    """)

    for filename in MIGRATIONS:
        sql((ROOT / "supabase/migrations" / filename).read_text())

    # A migration de certificação não produz estado e deve ser reentrante.
    contract_sql = CONTRACT.read_text()
    sql(contract_sql)
    checks["certificacao_reentrante"] = True

    # Cada mutação roda em uma conexão/tx própria. Ao abortar, o PostgreSQL
    # reverte o drift sintético quando o psql encerra a sessão.
    def contract_rejects(mutation):
        return sql(f"BEGIN;\n{mutation}\n{contract_sql}", check=False).returncode != 0

    checks["detecta_trigger_fora_da_origem_normal"] = contract_rejects(
        "ALTER TABLE public.search_analytics "
        "ENABLE REPLICA TRIGGER trg_normalize_search_analytics_insert;"
    )
    checks["detecta_security_definer"] = contract_rejects(
        "ALTER FUNCTION public.normalize_search_analytics_insert() SECURITY DEFINER;"
    )
    checks["detecta_search_path_divergente"] = contract_rejects(
        "ALTER FUNCTION public.normalize_search_analytics_insert() SET search_path = public;"
    )
    checks["detecta_policy_insert_permissiva"] = contract_rejects("""
      DROP POLICY "Users insert own search analytics" ON public.search_analytics;
      CREATE POLICY "Users insert own search analytics"
      ON public.search_analytics FOR INSERT TO authenticated WITH CHECK (true);
    """)
    checks["detecta_grant_update_excessivo"] = contract_rejects(
        "GRANT UPDATE ON public.search_analytics TO authenticated;"
    )
    checks["detecta_policy_select_sem_gestao"] = contract_rejects("""
      DROP POLICY "Authorized users read search analytics" ON public.search_analytics;
      CREATE POLICY "Authorized users read search analytics"
      ON public.search_analytics FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
    """)
    checks["detecta_acl_incompleta_do_service_role"] = contract_rejects(
        "REVOKE DELETE ON public.search_analytics FROM service_role;"
    )
    checks["detecta_execute_direto_do_normalizador"] = contract_rejects(
        "GRANT EXECUTE ON FUNCTION public.normalize_search_analytics_insert() TO authenticated;"
    )

    sql(FIXTURE.read_text())
    checks["fixture_funcional_aprovado"] = True
    checks["fixture_reverte_eventos"] = (
        sql("SELECT count(*) = 0 FROM public.search_analytics;").stdout.strip() == "t"
    )
    checks["trigger_origem_normal"] = (
        sql("""
          SELECT count(*) = 1
          FROM pg_trigger
          WHERE tgrelid = 'public.search_analytics'::regclass
            AND tgname = 'trg_normalize_search_analytics_insert'
            AND tgenabled = 'O' AND tgtype = 7 AND NOT tgisinternal;
        """).stdout.strip() == "t"
    )
    checks["acl_cliente_minima"] = (
        sql("""
          SELECT
            has_table_privilege('authenticated', 'public.search_analytics', 'SELECT, INSERT')
            AND NOT has_table_privilege('authenticated', 'public.search_analytics', 'UPDATE, DELETE')
            AND NOT has_table_privilege('anon', 'public.search_analytics', 'SELECT, INSERT');
        """).stdout.strip() == "t"
    )

    def invalid_payload_rejected(values):
        statement = f"""
          BEGIN;
          SET LOCAL ROLE authenticated;
          SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
          INSERT INTO public.search_analytics (search_term, results_count, search_context)
          VALUES ({values});
          ROLLBACK;
        """
        return sql(statement, check=False).returncode != 0

    checks["rejeita_termo_vazio"] = invalid_payload_rejected("'   ', 1, '{}'::text")
    checks["rejeita_resultado_negativo"] = invalid_payload_rejected("'válido', -1, '{}'::text")
    checks["rejeita_contexto_nao_json"] = invalid_payload_rejected("'válido', 1, 'not-json'")

    normalized = sql("""
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
      INSERT INTO public.search_analytics (search_term, results_count, search_context)
      VALUES ('  Termo normalizado  ', 2, '{"origem":"fixture"}')
      RETURNING search_term;
      ROLLBACK;
    """).stdout.splitlines()
    checks["normaliza_espacos_do_termo"] = "Termo normalizado" in normalized

    failed = [name for name, passed in checks.items() if not passed]
    print(json.dumps({
        "ambiente": "Supabase PostgreSQL 17 descartável sem rede",
        "remoto_validado": False,
        "checks": checks,
        "failed": failed,
    }, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
