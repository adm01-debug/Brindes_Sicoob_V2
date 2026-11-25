"""Valida a notificação ao vendedor quando a Singular decide o orçamento (SIC-110/SIC-044)."""
from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-decisao-singular-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/singular-quote-notification-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20261123090000_notify_singular_quote_decision.sql"
QUOTE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
SELLER = "99999999-9999-4999-8999-999999999999"
INACTIVE = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
DELETED = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2"


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


def notificacoes():
    result = sql(f"""
      SELECT COALESCE(string_agg(
        user_id::text || '|' || title || '|' || COALESCE(metadata ->> 'decisao', 'sem-metadata'),
        '~' ORDER BY user_id::text
      ), '')
      FROM public.workspace_notifications
      WHERE metadata ->> 'quote_id' = '{QUOTE}';
    """)
    value = result.stdout.strip()
    return value.split("~") if value else []


def decidir(status, notas="", de="pending_singular_approval"):
    sql(f"""
      UPDATE public.quotes
         SET status='{de}', rejection_notes=NULL
       WHERE id='{QUOTE}';
      DELETE FROM public.workspace_notifications;
      UPDATE public.quotes
         SET status='{status}', rejection_notes=NULLIF('{notas}','')
       WHERE id='{QUOTE}';
    """)
    return notificacoes()


checks = {}
detalhe = {}
try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(f"""
      INSERT INTO public.profiles(user_id,role,is_active,deleted_at) VALUES
        ('{SELLER}','vendedor',true,NULL),
        ('{INACTIVE}','vendedor',false,NULL),
        ('{DELETED}','vendedor',true,now());
      INSERT INTO public.quotes(id,seller_id,quote_number,status)
      VALUES ('{QUOTE}','{SELLER}','SCO-TESTE-110','pending_singular_approval');
    """)

    antes = sql(f"SELECT count(*) FROM public.workspace_notifications;").stdout.strip()
    checks["sem_notificacao_antes_da_decisao"] = antes == "0"

    sql(MIGRATION.read_text())
    sql(MIGRATION.read_text())
    checks["migration_reentrante"] = True

    aprovado = decidir("approved_singular")
    checks["notifica_aprovacao"] = aprovado == [f"{SELLER}|Orçamento aprovado pela Singular|aprovado"]
    checks["rotula_aprovacao"] = aprovado == [f"{SELLER}|Orçamento aprovado pela Singular|aprovado"]
    detalhe["aprovado"] = aprovado

    recusa_esperada = [f"{SELLER}|Orçamento recusado pela Singular|recusado"]
    ajuste = decidir(
        "rejected_singular",
        "Modificações sugeridas: revisar frete",
    )
    checks["notifica_devolucao_para_ajustes"] = ajuste == [
        f"{SELLER}|Orçamento devolvido para ajustes pela Singular|ajuste"
    ]
    checks["rotula_ajuste_distinto_de_recusa"] = ajuste != recusa_esperada
    detalhe["ajuste"] = ajuste

    recusa = decidir("rejected_singular", "Cliente desistiu da compra")
    checks["notifica_recusa"] = recusa == [f"{SELLER}|Orçamento recusado pela Singular|recusado"]
    detalhe["recusa"] = recusa

    sql("DELETE FROM public.workspace_notifications;")
    sql(f"UPDATE public.quotes SET status='approved_singular' WHERE id='{QUOTE}';")
    sql(f"UPDATE public.quotes SET status='approved_singular' WHERE id='{QUOTE}';")
    repetido = sql(f"""
      SELECT count(*) FROM public.workspace_notifications
       WHERE metadata ->> 'quote_id' = '{QUOTE}';
    """).stdout.strip()
    checks["nao_renotifica_status_repetido"] = repetido == "1"

    sql(f"UPDATE public.quotes SET status='pending_singular_approval' WHERE id='{QUOTE}';")
    sql("DELETE FROM public.workspace_notifications;")
    sql(f"""
      UPDATE public.quotes SET seller_id='{INACTIVE}';
      UPDATE public.quotes SET status='approved_singular';
    """)
    checks["ignora_perfil_inativo"] = sql(
        "SELECT count(*) FROM public.workspace_notifications;"
    ).stdout.strip() == "0"

    sql(f"""
      UPDATE public.quotes SET status='rejected_singular', seller_id='{DELETED}';
    """)
    checks["ignora_perfil_excluido"] = sql(
        "SELECT count(*) FROM public.workspace_notifications;"
    ).stdout.strip() == "0"

    # Volta a pendente antes de zerar o vendedor: sem transição de status o
    # gatilho retorna cedo e o cenário não exercitaria o filtro de destinatário.
    sql("""
      UPDATE public.quotes SET status='pending_singular_approval';
    """)
    sql("DELETE FROM public.workspace_notifications;")
    sql("""
      UPDATE public.quotes SET seller_id=NULL;
      UPDATE public.quotes SET status='rejected_singular';
    """)
    checks["ignora_sem_vendedor"] = sql(
        "SELECT count(*) FROM public.workspace_notifications;"
    ).stdout.strip() == "0"

    assert all(checks.values()), {"checks": checks, "detalhe": detalhe}
    print(json.dumps({
        "ambiente": "PostgreSQL 17 descartável sem rede; dados sintéticos",
        "supabase_remoto_consultado": False,
        "notificacoes": detalhe,
        "cenarios": checks,
    }, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
