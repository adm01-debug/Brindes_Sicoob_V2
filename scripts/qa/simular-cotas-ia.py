"""Valida cota de IA, ACL e isolamento de ator em PostgreSQL descartável."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-ai-quota-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261016163000_harden_ai_usage_quotas.sql"
USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_USER_ID = "22222222-2222-4222-8222-222222222222"


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
      CREATE SCHEMA auth;
      CREATE TYPE public.app_role AS ENUM (
        'admin', 'manager', 'vendedor', 'supervisor', 'dev',
        'gestor_compras', 'gerente_pa', 'comprador_pac', 'comprador_singular'
      );
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.role', true), '') $$;
      CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL);
      CREATE TABLE public.ai_usage_quotas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role public.app_role NOT NULL UNIQUE,
        monthly_limit integer NOT NULL DEFAULT 100,
        is_unlimited boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.ai_usage_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        function_name text NOT NULL,
        model text,
        status text NOT NULL DEFAULT 'success',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      INSERT INTO public.user_roles (user_id, role)
      VALUES ('11111111-1111-4111-8111-111111111111', 'vendedor');
    """)
    sql(MIGRATION.read_text())

    checks["seed_todos_os_papeis"] = sql(
        "SELECT count(*) = 9 FROM public.ai_usage_quotas;"
    ).stdout.strip() == "t"
    checks["acl_acquire_service_only"] = sql("""
      SELECT has_function_privilege('service_role', 'public.acquire_ai_quota(uuid,text,text)', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'public.acquire_ai_quota(uuid,text,text)', 'EXECUTE')
        AND NOT has_function_privilege('anon', 'public.acquire_ai_quota(uuid,text,text)', 'EXECUTE');
    """).stdout.strip() == "t"

    own_check = sql(f"""
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '{USER_ID}', true);
      SELECT public.check_ai_quota('{USER_ID}'::uuid)->>'allowed';
      ROLLBACK;
    """).stdout.splitlines()
    checks["usuario_consulta_propria_cota"] = "true" in own_check

    cross_actor = sql(f"""
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '{USER_ID}', true);
      SELECT public.check_ai_quota('{OTHER_USER_ID}'::uuid);
      ROLLBACK;
    """, check=False)
    checks["bola_de_cota_bloqueada"] = cross_actor.returncode != 0

    sql("UPDATE public.ai_usage_quotas SET monthly_limit = 2 WHERE role = 'vendedor';")
    reservations = sql(f"""
      BEGIN;
      SET LOCAL ROLE service_role;
      SELECT set_config('request.jwt.claim.role', 'service_role', true);
      SELECT public.acquire_ai_quota('{USER_ID}'::uuid, 'fixture', 'fixture')->>'allowed';
      SELECT public.acquire_ai_quota('{USER_ID}'::uuid, 'fixture', 'fixture')->>'allowed';
      SELECT public.acquire_ai_quota('{USER_ID}'::uuid, 'fixture', 'fixture')->>'allowed';
      COMMIT;
    """).stdout.splitlines()
    checks["reserva_atomica_respeita_limite"] = reservations.count("true") == 2 and reservations.count("false") == 1

    sql(f"""
      UPDATE public.ai_usage_logs
      SET created_at = statement_timestamp() - interval '16 minutes'
      WHERE user_id = '{USER_ID}'::uuid AND status = 'pending';
    """)
    renewed = sql(f"""
      BEGIN;
      SET LOCAL ROLE service_role;
      SELECT set_config('request.jwt.claim.role', 'service_role', true);
      SELECT public.acquire_ai_quota('{USER_ID}'::uuid, 'fixture', 'fixture')->>'allowed';
      ROLLBACK;
    """).stdout.splitlines()
    checks["reserva_abandonada_expira"] = "true" in renewed

    missing_quota = sql(f"""
      BEGIN;
      DELETE FROM public.user_roles WHERE user_id = '{USER_ID}'::uuid;
      SET LOCAL ROLE service_role;
      SELECT set_config('request.jwt.claim.role', 'service_role', true);
      SELECT public.acquire_ai_quota('{USER_ID}'::uuid, 'fixture', 'fixture')->>'reason';
      ROLLBACK;
    """).stdout.splitlines()
    checks["sem_cota_falha_fechado"] = "quota_not_configured" in missing_quota

    failed = [name for name, passed in checks.items() if not passed]
    print(json.dumps({"checks": checks, "failed": failed}, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
