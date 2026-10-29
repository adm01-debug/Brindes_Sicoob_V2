"""Valida a elegibilidade da notificação de aprovação em PostgreSQL descartável."""
from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-notif-destinatarios-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/singular-quote-notification-fixture.sql"
BASELINE = ROOT / "supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql"
MIGRATION = ROOT / "supabase/migrations/20261029200521_harden_singular_quote_notification_recipients.sql"
SINGULAR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
OTHER_SINGULAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
QUOTE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
USERS = {
    "ativo_autoritativo": "11111111-1111-4111-8111-111111111111",
    "inativo": "22222222-2222-4222-8222-222222222222",
    "excluido": "33333333-3333-4333-8333-333333333333",
    "sem_papel_canonico": "44444444-4444-4444-8444-444444444444",
    "papel_revogado": "55555555-5555-4555-8555-555555555555",
    "outra_cooperativa": "66666666-6666-4666-8666-666666666666",
    "dois_papeis_validos": "77777777-7777-4777-8777-777777777777",
    "ativo_nulo": "88888888-8888-4888-8888-888888888888",
}
EXPECTED = sorted([USERS["ativo_autoritativo"], USERS["dois_papeis_validos"]])


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def recipients():
    result = sql(f"""
      SELECT COALESCE(string_agg(user_id::text, ',' ORDER BY user_id::text), '')
      FROM public.workspace_notifications
      WHERE metadata ->> 'quote_id' = '{QUOTE}';
    """)
    value = result.stdout.strip()
    return value.split(",") if value else []


def submit_again():
    sql(f"UPDATE public.quotes SET status='pending' WHERE id='{QUOTE}';")
    sql(f"UPDATE public.quotes SET status='pending_singular_approval' WHERE id='{QUOTE}';")


checks = {}
try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(BASELINE.read_text())
    sql(f"""
      INSERT INTO public.profiles(user_id,cooperativa_id,role,is_active,deleted_at) VALUES
        ('{USERS['ativo_autoritativo']}','{SINGULAR}','vendedor',true,NULL),
        ('{USERS['inativo']}','{SINGULAR}','comprador_singular',false,NULL),
        ('{USERS['excluido']}','{SINGULAR}','gestor_compras',true,now()),
        ('{USERS['sem_papel_canonico']}','{SINGULAR}','comprador_singular',true,NULL),
        ('{USERS['papel_revogado']}','{SINGULAR}','comprador_singular',true,NULL),
        ('{USERS['outra_cooperativa']}','{OTHER_SINGULAR}','comprador_singular',true,NULL),
        ('{USERS['dois_papeis_validos']}','{SINGULAR}','vendedor',true,NULL),
        ('{USERS['ativo_nulo']}','{SINGULAR}','comprador_singular',NULL,NULL);
      INSERT INTO public.user_roles(user_id,role) VALUES
        ('{USERS['ativo_autoritativo']}','comprador_singular'),
        ('{USERS['inativo']}','comprador_singular'),
        ('{USERS['excluido']}','gestor_compras'),
        ('{USERS['papel_revogado']}','vendedor'),
        ('{USERS['outra_cooperativa']}','comprador_singular'),
        ('{USERS['dois_papeis_validos']}','gestor_compras'),
        ('{USERS['dois_papeis_validos']}','comprador_singular'),
        ('{USERS['ativo_nulo']}','comprador_singular');
      INSERT INTO public.quotes(id,singular_id,quote_number,status)
      VALUES ('{QUOTE}','{SINGULAR}','SCO-TESTE-065','pending');
    """)

    submit_again()
    legacy_recipients = recipients()
    checks["baseline_reproduz_lacuna"] = (
        USERS["inativo"] in legacy_recipients
        and USERS["excluido"] in legacy_recipients
        and USERS["sem_papel_canonico"] in legacy_recipients
    )

    sql("TRUNCATE public.workspace_notifications;")
    sql(MIGRATION.read_text())
    submit_again()
    actual = recipients()
    checks["inclui_papel_canonico_apesar_de_role_legado"] = USERS["ativo_autoritativo"] in actual
    checks["rejeita_perfis_inativos_excluidos_ou_sem_papel"] = not any(
        USERS[key] in actual
        for key in ("inativo", "excluido", "sem_papel_canonico", "papel_revogado", "ativo_nulo")
    )
    checks["mantem_escopo_da_cooperativa"] = USERS["outra_cooperativa"] not in actual
    checks["deduplica_papeis_validos"] = actual.count(USERS["dois_papeis_validos"]) == 1
    checks["destinatarios_exatos"] = sorted(actual) == EXPECTED

    sql(MIGRATION.read_text())
    sql("TRUNCATE public.workspace_notifications;")
    submit_again()
    checks["migration_reentrante"] = sorted(recipients()) == EXPECTED

    assert all(checks.values()), {"checks": checks, "destinatarios": actual, "baseline": legacy_recipients}
    print(json.dumps({
        "ambiente": "PostgreSQL 17 descartável sem rede; dados sintéticos",
        "supabase_remoto_consultado": False,
        "notificacoes_antigas": sorted(legacy_recipients),
        "notificacoes_corrigidas": actual,
        "cenarios": checks,
    }, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
