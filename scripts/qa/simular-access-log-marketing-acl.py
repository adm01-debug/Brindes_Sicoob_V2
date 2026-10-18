"""Simula o hardening de ACL/RLS de logs e da view de taxonomia de marketing."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-access-log-acl-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261018131850_harden_access_blocked_log_and_marketing_view_acl.sql"
FIXTURE = ROOT / "tests/scenarios/sql/access-log-marketing-acl-fixture.sql"
ADMIN_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, check=True):
    return command(
        [
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "supabase_admin",
            "-d", "sicoob_simulation", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
        ],
        stdin=statement,
        check=check,
    )


def actor(role, user_id, statement, *, check=True):
    return sql(
        "BEGIN;\n"
        f"SELECT set_config('request.jwt.claim.sub', '{user_id}', true);\n"
        f"SET LOCAL ROLE {role};\n"
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
    fixture = FIXTURE.read_text()
    migration = MIGRATION.read_text()
    sql(fixture)
    sql("BEGIN;\n" + migration + "\nROLLBACK;")
    dry_run_clean = sql(
        "SELECT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.access_blocked_log'::regclass "
        "AND polname='System insert blocked logs') AND NOT EXISTS ("
        "SELECT 1 FROM pg_policy WHERE polrelid='public.access_blocked_log'::regclass "
        "AND polname='Service role inserts blocked access logs');"
    ).stdout.strip() == "t"
    sql(migration)
    sql(migration)

    service_insert = sql(
        "SET ROLE service_role; INSERT INTO public.access_blocked_log "
        "(user_id, ip_address, block_reason) VALUES "
        f"('{USER_ID}', '192.0.2.1', 'ip_not_whitelisted'); RESET ROLE;"
    ).returncode == 0

    checks = {
        "dry_run_rollback_sem_efeitos": dry_run_clean,
        "migracao_idempotente": sql(
            "SELECT count(*)=1 FROM pg_policy WHERE polrelid='public.access_blocked_log'::regclass "
            "AND polname='Service role inserts blocked access logs';"
        ).stdout.strip() == "t",
        "rls_permanece_habilitada": sql(
            "SELECT relrowsecurity FROM pg_class WHERE oid='public.access_blocked_log'::regclass;"
        ).stdout.strip() == "t",
        "publico_e_clientes_sem_insert": sql(
            "SELECT NOT has_table_privilege('anon','public.access_blocked_log','INSERT') "
            "AND NOT has_table_privilege('authenticated','public.access_blocked_log','INSERT');"
        ).stdout.strip() == "t",
        "anon_nao_insere_log": actor(
            "anon", USER_ID,
            "INSERT INTO public.access_blocked_log (ip_address, block_reason) "
            "VALUES ('192.0.2.9', 'tentativa');",
            check=False,
        ).returncode != 0,
        "authenticated_nao_insere_log": actor(
            "authenticated", USER_ID,
            "INSERT INTO public.access_blocked_log (ip_address, block_reason) "
            "VALUES ('192.0.2.10', 'tentativa');",
            check=False,
        ).returncode != 0,
        "service_role_insere_log": service_insert,
        "admin_le_logs_via_rls": actor(
            "authenticated", ADMIN_ID,
            "SELECT count(*) FROM public.access_blocked_log;",
        ).stdout.splitlines()[-1:] == ["1"],
        "usuario_sem_perfil_admin_nao_le_logs": actor(
            "authenticated", USER_ID,
            "SELECT count(*) FROM public.access_blocked_log;",
        ).stdout.splitlines()[-1:] == ["0"],
        "view_marketing_read_only_para_authenticated": sql(
            "SELECT has_table_privilege('authenticated','public.catalog_marketing_term_usage','SELECT') "
            "AND NOT has_table_privilege('authenticated','public.catalog_marketing_term_usage','INSERT') "
            "AND NOT has_table_privilege('authenticated','public.catalog_marketing_term_usage','UPDATE') "
            "AND NOT has_table_privilege('authenticated','public.catalog_marketing_term_usage','DELETE');"
        ).stdout.strip() == "t",
        "view_marketing_read_only_para_service_role": sql(
            "SELECT has_table_privilege('service_role','public.catalog_marketing_term_usage','SELECT') "
            "AND NOT has_table_privilege('service_role','public.catalog_marketing_term_usage','INSERT') "
            "AND NOT has_table_privilege('service_role','public.catalog_marketing_term_usage','UPDATE') "
            "AND NOT has_table_privilege('service_role','public.catalog_marketing_term_usage','DELETE');"
        ).stdout.strip() == "t",
        "view_marketing_sem_acesso_anonimo": sql(
            "SELECT NOT has_table_privilege('anon','public.catalog_marketing_term_usage','SELECT');"
        ).stdout.strip() == "t",
        "authenticated_consulta_view_marketing": actor(
            "authenticated", USER_ID,
            "SELECT count(*) FROM public.catalog_marketing_term_usage;",
        ).stdout.splitlines()[-1:] == ["1"],
    }

    assert all(checks.values()), json.dumps(checks, ensure_ascii=False)
    print(json.dumps({
        "ambiente": "PostgreSQL Supabase 17 descartável e sem rede",
        "banco_canonico_alterado": False,
        "imagem": image,
        "cenarios": checks,
    }, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
