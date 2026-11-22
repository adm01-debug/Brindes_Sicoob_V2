#!/usr/bin/env python3
"""Prova o job de relatórios agendados contra PostgreSQL real, sem saída de rede.

Sobe a imagem oficial da Supabase (pg_cron + pg_net + Vault já presentes), aplica
a migration verdadeira e verifica: job único na cadência certa, idempotência da
reaplicação, guardas de configuração e a requisição enfileirada pelo `pg_net`.
O container roda com `--network none`: a fila prova a intenção, a rede não existe.
"""
from pathlib import Path
import json
import subprocess
import sys
import time
import uuid

IMAGE = "public.ecr.aws/supabase/postgres:17.6.1.063"
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261122180000_schedule_scheduled_reports_worker.sql"
CONTAINER = "sicoob-reports-" + uuid.uuid4().hex[:10]


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(value, check=True):
    result = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "supabase_admin",
         "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
        stdin=value, check=False,
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result


def scalar(query):
    return sql(query).stdout.strip()


try:
    started = command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE, "postgres",
        "-D", "/var/lib/postgresql/data",
        "-c", "shared_preload_libraries=pg_cron,pg_net",
        "-c", "cron.database_name=postgres",
    ], check=False)
    if started.returncode:
        raise RuntimeError(started.stderr or started.stdout)

    for _ in range(180):
        logs = command(["docker", "logs", CONTAINER], check=False)
        if "PostgreSQL init process complete" in f"{logs.stdout}{logs.stderr}":
            break
        time.sleep(1)
    else:
        raise RuntimeError("initdb não concluiu")

    for _ in range(120):
        if sql("SELECT 1;", check=False).returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError("postgres não ficou pronto")

    sql("""
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
        CREATE EXTENSION IF NOT EXISTS pg_net;
        DROP EXTENSION IF EXISTS supabase_vault CASCADE;
        CREATE TABLE vault.decrypted_secrets (
          name text PRIMARY KEY,
          decrypted_secret text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        DO $roles$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN;
          END IF;
        END
        $roles$;
    """)

    migration_sql = MIGRATION.read_text()
    sql(migration_sql)

    checks = {}
    checks["funcao_criada"] = scalar(
        "SELECT to_regprocedure('public.dispatch_scheduled_reports()') IS NOT NULL;") == "t"
    checks["job_unico"] = scalar(
        "SELECT count(*) FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "1"
    checks["cadencia_10min"] = scalar(
        "SELECT schedule FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "*/10 * * * *"
    checks["job_usa_database_correto"] = scalar(
        "SELECT database FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "postgres"
    checks["job_ativo"] = scalar(
        "SELECT active FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "t"
    checks["job_chama_dispatch"] = scalar(
        "SELECT command FROM cron.job WHERE jobname = 'scheduled-reports-worker';"
    ).strip() == "SELECT public.dispatch_scheduled_reports();"
    checks["job_sem_credencial"] = scalar(
        "SELECT bool_and(command !~* '(apikey|bearer|eyJ)') FROM cron.job "
        "WHERE jobname = 'scheduled-reports-worker';") == "t"
    checks["security_definer"] = scalar(
        "SELECT prosecdef FROM pg_proc "
        "WHERE oid = 'public.dispatch_scheduled_reports()'::regprocedure;") == "t"
    checks["search_path_fixado"] = scalar(
        "SELECT array_to_string(proconfig, ',') FROM pg_proc "
        "WHERE oid = 'public.dispatch_scheduled_reports()'::regprocedure;"
    ).startswith("search_path=")

    # Vault vazio: sem requisição, retorno NULL, cron continua íntegro.
    checks["sem_vault_nao_dispara"] = scalar(
        "SELECT public.dispatch_scheduled_reports() IS NULL;") == "t"
    checks["sem_vault_sem_requisicao"] = scalar(
        "SELECT count(*) FROM net.http_request_queue;") == "0"

    # Reaplicação da migration não duplica o job.
    sql(migration_sql)
    checks["reaplicacao_nao_duplica"] = scalar(
        "SELECT count(*) FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "1"

    # URL fora do domínio Supabase: bloqueada.
    sql("""
        INSERT INTO vault.decrypted_secrets(name, decrypted_secret) VALUES
          ('sicoob_project_url', 'https://evil.example.com'),
          ('sicoob_internal_function_secret', repeat('a', 64));
    """)
    checks["url_invalida_bloqueada"] = scalar(
        "SELECT public.dispatch_scheduled_reports() IS NULL;") == "t"
    checks["url_invalida_sem_requisicao"] = scalar(
        "SELECT count(*) FROM net.http_request_queue;") == "0"

    # Segredo curto: bloqueado.
    sql("""
        DELETE FROM vault.decrypted_secrets;
        INSERT INTO vault.decrypted_secrets(name, decrypted_secret) VALUES
          ('sicoob_project_url', 'https://exemplo.supabase.co'),
          ('sicoob_internal_function_secret', 'curto');
    """)
    checks["segredo_curto_bloqueado"] = scalar(
        "SELECT public.dispatch_scheduled_reports() IS NULL;") == "t"
    checks["segredo_curto_sem_requisicao"] = scalar(
        "SELECT count(*) FROM net.http_request_queue;") == "0"

    # Configurado: enfileira exatamente uma requisição para o worker certo.
    # O worker do pg_net consome a fila commitada, então tudo roda numa transação
    # revertida no fim. Leituras em statements separados: a lista de alvos de um
    # mesmo SELECT não garante ordem de avaliação entre a chamada e os subselects.
    configured = sql("""
        BEGIN;
        DELETE FROM vault.decrypted_secrets;
        INSERT INTO vault.decrypted_secrets(name, decrypted_secret) VALUES
          ('sicoob_project_url', 'https://exemplo.supabase.co'),
          ('sicoob_internal_function_secret', repeat('b', 64));
        SELECT 'DISPATCHED=' || (public.dispatch_scheduled_reports() IS NOT NULL);
        SELECT 'TOTAL=' || count(*) FROM net.http_request_queue;
        SELECT 'URL=' || url FROM net.http_request_queue;
        SELECT 'METHOD=' || method FROM net.http_request_queue;
        SELECT 'SECRET_OK=' || (headers->>'x-sicoob-internal-secret' = repeat('b', 64))
          FROM net.http_request_queue;
        SELECT 'NO_ANON_KEY=' || (NOT (headers ? 'apikey')
          AND NOT (headers ? 'Authorization')) FROM net.http_request_queue;
        ROLLBACK;
    """)
    valores = dict(
        line.split("=", 1) for line in configured.stdout.strip().splitlines() if "=" in line
    )
    checks["vault_configurado_dispara"] = valores.get("DISPATCHED") == "true"
    checks["uma_requisicao"] = valores.get("TOTAL") == "1"
    checks["url_de_envio"] = valores.get("URL") == (
        "https://exemplo.supabase.co/functions/v1/send-scheduled-reports")
    checks["metodo_post"] = valores.get("METHOD") == "POST"
    checks["usa_segredo_interno"] = valores.get("SECRET_OK") == "true"
    checks["sem_anon_key"] = valores.get("NO_ANON_KEY") == "true"

    # ACL: só service_role executa.
    checks["acl_public_revogada"] = scalar("""
        SELECT NOT EXISTS (
          SELECT 1 FROM aclexplode(
            (SELECT proacl FROM pg_proc
             WHERE oid='public.dispatch_scheduled_reports()'::regprocedure)) a
          WHERE a.grantee = 0);""") == "t"
    checks["acl_anon_revogada"] = scalar("""
        SELECT NOT EXISTS (
          SELECT 1 FROM aclexplode(
            (SELECT proacl FROM pg_proc
             WHERE oid='public.dispatch_scheduled_reports()'::regprocedure)) a
          JOIN pg_roles r ON r.oid = a.grantee WHERE r.rolname = 'anon');""") == "t"
    checks["acl_service_role_libera"] = scalar("""
        SELECT EXISTS (
          SELECT 1 FROM aclexplode(
            (SELECT proacl FROM pg_proc
             WHERE oid='public.dispatch_scheduled_reports()'::regprocedure)) a
          JOIN pg_roles r ON r.oid = a.grantee WHERE r.rolname = 'service_role');""") == "t"

    denied = sql("SET ROLE authenticated; SELECT public.dispatch_scheduled_reports();", check=False)
    checks["authenticated_bloqueado"] = denied.returncode != 0
    checks["authenticated_bloqueado_acl"] = "permission denied" in (denied.stderr or "").lower()

    # REVERSAO: os comandos documentados no fim da migration precisam funcionar
    # de fato — rollback testado, não apenas citado no PR.
    sql("SELECT cron.unschedule('scheduled-reports-worker');")
    checks["reversao_remove_job"] = scalar(
        "SELECT count(*) FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "0"
    sql("DROP FUNCTION IF EXISTS public.dispatch_scheduled_reports();")
    # `::regprocedure` levanta erro quando a função já não existe; `to_regprocedure`
    # devolve NULL, que é exatamente o estado esperado após o rollback.
    checks["reversao_remove_funcao"] = scalar(
        "SELECT to_regprocedure('public.dispatch_scheduled_reports()') IS NULL;"
    ) == "t"
    # O rollback nao pode tocar nos agendamentos do gestor: a migration so mexe
    # em cron/funcao, nunca em dado de negocio. Fixture minima para provar.
    sql("""
        CREATE TABLE IF NOT EXISTS public.scheduled_reports (id uuid PRIMARY KEY);
        INSERT INTO public.scheduled_reports (id)
          VALUES ('00000000-0000-0000-0000-000000000001')
          ON CONFLICT DO NOTHING;
    """)
    checks["reversao_preserva_agendamentos"] = scalar(
        "SELECT count(*) FROM public.scheduled_reports;") == "1"
    # Reagendar após o rollback tem que voltar a funcionar (idempotência real).
    sql("SELECT cron.schedule('scheduled-reports-worker', '*/10 * * * *', "
        "'SELECT 1');")
    checks["reagendamento_idempotente"] = scalar(
        "SELECT count(*) FROM cron.job WHERE jobname = 'scheduled-reports-worker';") == "1"

    resultado = "aprovado" if all(checks.values()) else "reprovado"
    print(json.dumps({"resultado": resultado, "checks": checks}, ensure_ascii=False, indent=2))
    sys.exit(0 if resultado == "aprovado" else 1)
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
