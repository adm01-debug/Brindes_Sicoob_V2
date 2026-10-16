"""Valida o hardening de Storage/ACL em PostgreSQL Supabase descartável."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres
from supabase_postgres_container import start_supabase_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-storage-acl-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261016180000_harden_storage_and_public_favorites_acl.sql"
FIXTURE = ROOT / "tests/scenarios/sql/storage-acl-hardening-fixture.sql"


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


def actor(user_id, statement, *, claims=None):
    jwt = claims or "{}"
    return sql(
        "SET ROLE authenticated; "
        f"SET request.jwt.claim.sub = '{user_id}'; "
        f"SET request.jwt.claims = '{jwt}'; "
        + statement
    )


try:
    start_supabase_postgres(command, CONTAINER)
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
        "SELECT to_regprocedure('public.audit_security_definer_acl()') IS NULL;"
    ).stdout.strip() == "t"
    sql(migration)
    sql(migration)

    owner = "00000000-0000-0000-0000-000000000001"
    outsider = "00000000-0000-0000-0000-000000000002"
    supervisor = "00000000-0000-0000-0000-000000000003"

    checks = {
        "dry_run_sem_persistencia": dry_run_clean,
        "reaplicacao_idempotente": True,
        "gate_acl_sem_violacoes": sql(
            "SELECT count(*) = 0 FROM public.audit_security_definer_acl();"
        ).stdout.strip() == "t",
        "favoritos_publicos_revisados": sql(
            "SELECT has_function_privilege('anon', "
            "'public.get_public_favorite_list(text)', 'EXECUTE') "
            "AND has_function_privilege('anon', "
            "'public.get_public_favorite_reactions(text,text)', 'EXECUTE');"
        ).stdout.strip() == "t",
        "buckets_privados": sql(
            "SELECT bool_and(NOT public) FROM storage.buckets "
            "WHERE id IN ('proposals', 'quarantine');"
        ).stdout.strip() == "t",
        "policies_amplas_removidas": sql(
            "SELECT count(*) = 0 FROM pg_policies WHERE schemaname='storage' "
            "AND tablename='objects' AND policyname = ANY (ARRAY["
            "'Public Access to Proposals','Authenticated users can upload proposals',"
            "'Authenticated users can delete proposals','Admins podem visualizar quarentena']);"
        ).stdout.strip() == "t",
        "delete_proposals_equivale_select": sql(
            "SELECT (SELECT qual FROM pg_policies WHERE schemaname='storage' "
            "AND tablename='objects' AND policyname='proposals_quote_scope_select') "
            "IS NOT DISTINCT FROM "
            "(SELECT qual FROM pg_policies WHERE schemaname='storage' "
            "AND tablename='objects' AND policyname='proposals_quote_scope_delete');"
        ).stdout.strip() == "t",
        "email_admin_sem_rbac_nao_le_quarentena": actor(
            outsider,
            "SELECT count(*) FROM storage.objects WHERE bucket_id='quarantine';",
            claims='{"email":"admin-falso@example.invalid"}',
        ).stdout.strip() == "0",
        "supervisor_le_quarentena": actor(
            supervisor,
            "SELECT count(*) FROM storage.objects WHERE bucket_id='quarantine';",
        ).stdout.strip() == "1",
        "dono_exclui_proposta": actor(
            owner,
            "DELETE FROM storage.objects "
            "WHERE id='20000000-0000-0000-0000-000000000001' RETURNING id;",
        ).stdout.strip() == "20000000-0000-0000-0000-000000000001",
        "vendedor_exclui_proposta_do_orcamento": actor(
            owner,
            "DELETE FROM storage.objects "
            "WHERE id='20000000-0000-0000-0000-000000000002' RETURNING id;",
        ).stdout.strip() == "20000000-0000-0000-0000-000000000002",
        "terceiro_nao_exclui_proposta": actor(
            outsider,
            "DELETE FROM storage.objects "
            "WHERE id='20000000-0000-0000-0000-000000000003' RETURNING id;",
        ).stdout.strip() == "",
        "proposta_negada_permanece": sql(
            "SELECT count(*) = 1 FROM storage.objects "
            "WHERE id='20000000-0000-0000-0000-000000000003';"
        ).stdout.strip() == "t",
        "cron_health_check_seguro": sql(
            "SELECT count(*) = 1 FROM cron.job "
            "WHERE jobname='connections-health-check' AND active "
            "AND schedule='7,22,37,52 * * * *' "
            "AND command='SELECT public.dispatch_sicoob_connections_health_check();';"
        ).stdout.strip() == "t",
        "dispatch_service_role_enfileira_http": sql(
            "SET ROLE service_role; "
            "SELECT public.dispatch_sicoob_connections_health_check();"
        ).stdout.strip() == "77",
        "authenticated_nao_executa_dispatch": sql(
            "SET ROLE authenticated; "
            "SELECT public.dispatch_sicoob_connections_health_check();",
            False,
        ).returncode != 0,
        "authenticated_nao_le_evidencia": sql(
            "SET ROLE authenticated; "
            "SELECT public.get_connections_hub_operational_evidence();",
            False,
        ).returncode != 0,
        "evidencia_cobre_dois_crons": sql(
            "SET ROLE service_role; SELECT jsonb_array_length("
            "public.get_connections_hub_operational_evidence()->'cron_jobs');"
        ).stdout.strip() == "2",
        "evidencia_cobre_quatro_triggers": sql(
            "SET ROLE service_role; SELECT jsonb_array_length("
            "public.get_connections_hub_operational_evidence()->'triggers');"
        ).stdout.strip() == "4",
    }

    sql("DELETE FROM vault.decrypted_secrets "
        "WHERE name='sicoob_internal_function_secret';")
    sql(migration)
    checks["vault_invalido_remove_cron"] = sql(
        "SELECT count(*) = 0 FROM cron.job WHERE jobname='connections-health-check';"
    ).stdout.strip() == "t"
    checks["vault_invalido_nao_dispara_http"] = sql(
        "SELECT public.dispatch_sicoob_connections_health_check() IS NULL;"
    ).stdout.strip() == "t"

    assert all(checks.values()), checks
    print(json.dumps({
        "ambiente": "PostgreSQL Supabase descartável sem rede",
        "banco_canonico_alterado": False,
        "cenarios": checks,
    }, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
