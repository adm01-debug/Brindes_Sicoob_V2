"""Simula a proteção de views e da criação de notificações em PostgreSQL Supabase."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-view-hardening-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261016201500_restore_view_invoker_and_notification_scope.sql"
FIXTURE = ROOT / "tests/scenarios/sql/view-notification-hardening-fixture.sql"
USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(value, check=True):
    result = command(
        [
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "supabase_admin",
            "-d", "sicoob_simulation", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
        ],
        stdin=value,
        check=False,
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result


def authenticated(statement, *, user_id=USER_A, check=True):
    return sql(
        "BEGIN;\n"
        f"SELECT set_config('request.jwt.claim.sub', '{user_id}', true);\n"
        "SET LOCAL ROLE authenticated;\n"
        + statement
        + "\nCOMMIT;",
        check=check,
    )


try:
    image = start_supabase_postgres(command, CONTAINER)
    wait_for_postgres(command, CONTAINER)
    command([
        "docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
        "--template=template0", "sicoob_simulation",
    ])
    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(MIGRATION.read_text())

    views = [
        "sicoob_budget_audit",
        "telemetry_query_performance",
        "v_full_scope_grants",
        "v_sicoob_hierarchy",
    ]
    checks = {
        "quatro_views_com_security_invoker": sql(
            "SELECT count(*)=4 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
            "WHERE n.nspname='public' AND c.relname=ANY(ARRAY["
            + ",".join("'" + view + "'" for view in views)
            + "]) AND c.reloptions @> ARRAY['security_invoker=on']::text[];"
        ).stdout.strip() == "t",
        "views_respeitam_rls_do_invocador": all(
            "COUNT=0" in authenticated(
                f"SELECT 'COUNT=' || count(*) FROM public.{view};", user_id=USER_B
            ).stdout.splitlines()
            for view in views
        ),
        "insercao_para_si_permitida": authenticated(
            f"INSERT INTO public.notifications VALUES ('33333333-3333-3333-3333-333333333333', '{USER_A}', 'ok');"
        ).returncode == 0,
        "insercao_para_outro_recusada": authenticated(
            f"INSERT INTO public.notifications VALUES ('44444444-4444-4444-4444-444444444444', '{USER_B}', 'indevida');",
            check=False,
        ).returncode != 0,
    }
    if not all(checks.values()):
        raise RuntimeError("Falha nas asserções: " + json.dumps(checks, ensure_ascii=False))
    print(json.dumps({"ok": True, "imagem": image, "checks": checks}, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
