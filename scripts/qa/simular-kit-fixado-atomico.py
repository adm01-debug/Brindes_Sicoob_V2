"""Valida a troca transacional de kit fixado em PostgreSQL 17 descartável."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-kit-pinned-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261016193000_pin_custom_kit_atomically.sql"
ACTOR = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
KIT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
KIT_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"
KIT_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"


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


def actor_call(kit_id):
    return f"""
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '{ACTOR}', true);
      SELECT public.set_custom_kit_pinned('{kit_id}', true);
      COMMIT;
    """


checks = {}
try:
    start_supabase_postgres(command, CONTAINER)
    wait_for_postgres(command, CONTAINER)
    command([
        "docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
        "--template=template0", "sicoob_simulation",
    ])
    sql(f"""
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
      END $$;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE public.custom_kits (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        is_pinned boolean NOT NULL DEFAULT false,
        last_used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
      INSERT INTO public.custom_kits (id, user_id, is_pinned, last_used_at) VALUES
        ('{KIT_A}', '{ACTOR}', true, now() - interval '1 day'),
        ('{KIT_B}', '{ACTOR}', true, now()),
        ('{KIT_OTHER}', '{OTHER}', false, now());
    """)

    migration = MIGRATION.read_text()
    sql(migration)
    checks["reconcilia_duplicidade_legada"] = (
        sql(f"SELECT count(*) FROM public.custom_kits WHERE user_id='{ACTOR}' AND is_pinned;")
        .stdout.strip() == "1"
    )
    checks["mantem_mais_recente"] = (
        sql(f"SELECT is_pinned FROM public.custom_kits WHERE id='{KIT_B}';").stdout.strip() == "t"
    )

    sql(actor_call(KIT_A))
    checks["troca_destaque_atomicamente"] = (
        sql(f"""
          SELECT count(*) = 1 AND bool_and(id = '{KIT_A}')
          FROM public.custom_kits WHERE user_id = '{ACTOR}' AND is_pinned;
        """).stdout.strip() == "t"
    )

    cross_scope = sql(actor_call(KIT_OTHER), check=False)
    checks["rejeita_kit_de_outro_usuario"] = (
        cross_scope.returncode != 0 and "fora do escopo" in cross_scope.stderr
    )
    unauthenticated = sql(
        f"SELECT public.set_custom_kit_pinned('{KIT_A}', true);", check=False
    )
    checks["rejeita_sessao_sem_identidade"] = (
        unauthenticated.returncode != 0 and "Autenticação obrigatória" in unauthenticated.stderr
    )

    duplicate = sql(
        f"UPDATE public.custom_kits SET is_pinned=true WHERE id='{KIT_B}';", check=False
    )
    checks["indice_bloqueia_segundo_destaque"] = duplicate.returncode != 0
    checks["acl_minima"] = (
        sql("""
          SELECT has_function_privilege('authenticated', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE')
            AND NOT has_function_privilege('anon', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE')
            AND NOT has_function_privilege('public', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE');
        """).stdout.strip() == "t"
    )

    # Reaplicar deve preservar o contrato e os dados.
    sql(migration)
    checks["migration_reentrante"] = True

    failed = [name for name, passed in checks.items() if not passed]
    print(json.dumps({
        "ambiente": "Supabase PostgreSQL 17 descartável sem rede",
        "checks": checks,
        "failed": failed,
    }, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
