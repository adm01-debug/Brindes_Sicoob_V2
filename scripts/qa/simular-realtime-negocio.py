"""Valida publicação Realtime seletiva em PostgreSQL Supabase descartável."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-realtime-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261016190000_enable_scoped_business_realtime.sql"
FIXTURE = ROOT / "tests/scenarios/sql/business-realtime-fixture.sql"


def command(args, *, stdin=None, check=True):
    return subprocess.run(
        args,
        input=stdin,
        text=True,
        capture_output=True,
        check=check,
    )


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


try:
    image = start_supabase_postgres(command, CONTAINER)
    wait_for_postgres(command, CONTAINER)
    command([
        "docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
        "--template=template0", "sicoob_simulation",
    ])

    fixture = FIXTURE.read_text()
    migration = MIGRATION.read_text()
    sql(fixture)

    refused_without_rls = sql(
        "BEGIN; ALTER TABLE public.custom_kits DISABLE ROW LEVEL SECURITY;\n"
        + migration,
        check=False,
    )
    if refused_without_rls.returncode == 0 or "sem RLS" not in refused_without_rls.stderr:
        raise RuntimeError("A migration aceitou publicação sem RLS.")

    sql(migration)
    sql(migration)

    checks = {
        "reaplicacao_idempotente": True,
        "publicacao_seletiva": sql(
            "SELECT NOT puballtables FROM pg_publication "
            "WHERE pubname='supabase_realtime';"
        ).stdout.strip() == "t",
        "doze_tabelas_publicadas": sql(
            "SELECT count(*)=12 FROM pg_publication_tables "
            "WHERE pubname='supabase_realtime' AND schemaname='public';"
        ).stdout.strip() == "t",
        "login_isolado_por_usuario": sql(
            "SELECT count(*)=1 FROM pg_policies WHERE schemaname='public' "
            "AND tablename='login_attempts' "
            "AND policyname='user_read_own_login_attempts' "
            "AND roles=ARRAY['authenticated']::name[] AND cmd='SELECT' "
            "AND strpos(qual, 'user_id')>0 AND strpos(qual, 'uid()')>0;"
        ).stdout.strip() == "t",
        "sete_identidades_full": sql(
            "SELECT count(*)=7 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
            "WHERE n.nspname='public' AND c.relreplident='f' AND c.relname=ANY(ARRAY["
            "'custom_kits','discount_approval_requests','integration_credentials',"
            "'kit_comments','orders','quotes','sicoob_orders']);"
        ).stdout.strip() == "t",
        "monitor_hardening_aprovado": sql(
            "SELECT (public.notify_hardening_regression()->>'score')::int=5;"
        ).stdout.strip() == "t",
    }
    if not all(checks.values()):
        raise RuntimeError("Falha nas asserções: " + json.dumps(checks, ensure_ascii=False))

    print(json.dumps({"ok": True, "imagem": image, "checks": checks}, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
