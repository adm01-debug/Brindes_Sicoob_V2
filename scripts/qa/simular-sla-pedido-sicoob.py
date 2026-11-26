#!/usr/bin/env python3
"""Valida o ciclo de vida do SLA do pedido Sicoob em PostgreSQL isolado e sem rede."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-sla-" + uuid.uuid4().hex[:10]
MIGRATION = ROOT / "supabase/migrations/20261126120000_sicoob_order_sla_lifecycle.sql"
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-order-sla-fixture.sql"

PARADO = "11111111-1111-4111-8111-111111111111"
EM_APROVACAO = "22222222-2222-4222-8222-222222222222"
PENDENTE = "33333333-3333-4333-8333-333333333333"
RASCUNHO = "44444444-4444-4444-8444-444444444444"
CONFIRMADO = "55555555-5555-4555-8555-555555555555"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-XqAt", "-v", "ON_ERROR_STOP=1"],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(f"psql falhou com código {response.returncode}: {response.stderr.strip()}")
    return response


def scalar(statement):
    return sql(statement).stdout.strip()


def estado(order_id):
    return scalar(
        "SELECT coalesce(status, 'null') || '|' || coalesce(sla_status, 'null') || '|' || "
        "coalesce(round(extract(epoch FROM (sla_deadline - now())) / 60)::text, 'sem-prazo') "
        f"FROM public.sicoob_orders WHERE id = '{order_id}';"
    )


resultado = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

checks = {}
try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:16-alpine",
    ])
    wait_for_postgres(command, CONTAINER)

    sql(FIXTURE.read_text())
    # Estado anterior à migration: pedido em fluxo há dias sem prazo nenhum.
    sql(f"""
      INSERT INTO public.sicoob_orders (id, status, created_at, total_amount) VALUES
        ('{PARADO}', 'waiting_approval', now() - interval '5 days', 900),
        ('{RASCUNHO}', 'draft', now(), 300),
        ('{CONFIRMADO}', 'confirmed', now() - interval '10 days', 400);
      UPDATE public.sicoob_orders
         SET sla_deadline = now() - interval '9 days', sla_status = 'critical'
       WHERE id = '{CONFIRMADO}';
    """)
    assert estado(PARADO).endswith("|sem-prazo"), estado(PARADO)

    sql(MIGRATION.read_text())

    # 1. Quem já estava em fluxo recebe o prazo mais antigo possível e aparece vencido.
    prazo_do_parado, status_do_parado = scalar(
        "SELECT round(extract(epoch FROM (sla_deadline - created_at)) / 3600)::text || '|' || sla_status "
        f"FROM public.sicoob_orders WHERE id = '{PARADO}';"
    ).split("|")
    checks["pedido_em_fluxo_sem_prazo_e_corrigido"] = (
        prazo_do_parado == "48" and status_do_parado == "critical"
    )

    # 2. Pedido que nasce ou entra em aprovação ganha 48h e volta a 'normal'.
    sql(f"""
      INSERT INTO public.sicoob_orders (id, status, total_amount) VALUES
        ('{EM_APROVACAO}', 'waiting_approval', 700),
        ('{PENDENTE}', 'pending', 800);
    """)
    status_novo, prazo_novo = estado(EM_APROVACAO).split("|")[1:]
    checks["nascimento_em_aprovacao_recebe_48h"] = status_novo == "normal" and 2875 <= int(prazo_novo) <= 2880

    sql(f"UPDATE public.sicoob_orders SET status = 'waiting_approval' WHERE id = '{PENDENTE}';")
    status_transicao, prazo_transicao = estado(PENDENTE).split("|")[1:]
    checks["entrada_em_aprovacao_recebe_48h"] = status_transicao == "normal" and 2875 <= int(prazo_transicao) <= 2880

    # 3. Fora do fluxo de aprovação não se inventa prazo.
    sql(f"UPDATE public.sicoob_orders SET total_amount = 350 WHERE id = '{RASCUNHO}';")
    checks["rascunho_nao_recebe_prazo"] = estado(RASCUNHO).endswith("|sem-prazo")

    # 4. Saída da aprovação preserva o prazo histórico.
    antes_da_saida = estado(EM_APROVACAO)
    sql(f"UPDATE public.sicoob_orders SET status = 'confirmed' WHERE id = '{EM_APROVACAO}';")
    checks["prazo_preservado_ao_sair_da_aprovacao"] = (
        estado(EM_APROVACAO).split("|")[1:] == antes_da_saida.split("|")[1:]
    )

    # 5. Recalculo por rotina: parados viram crítico, próximos do limite viram alerta.
    sql(f"UPDATE public.sicoob_orders SET sla_deadline = now() - interval '30 minutes' WHERE id = '{PENDENTE}';")
    assert estado(PENDENTE).split("|")[1] == "normal", estado(PENDENTE)
    alterados = scalar("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_marca_vencido_como_critico"] = (
        int(alterados) >= 1 and estado(PENDENTE).split("|")[1] == "critical"
    )

    sql(f"UPDATE public.sicoob_orders SET sla_deadline = now() + interval '1 hour' WHERE id = '{PENDENTE}';")
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_marca_proximo_do_limite_como_alerta"] = estado(PENDENTE).split("|")[1] == "warning"

    # 6. Pedido encerrado não é reclassificado pela rotina.
    antes = estado(CONFIRMADO)
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_nao_toca_pedido_encerrado"] = estado(CONFIRMADO) == antes

    # 7. A rotina é do serviço, não do usuário final.
    negado = sql(
        "SET ROLE authenticated; SELECT public.refresh_sicoob_order_sla_status();", check=False
    )
    permitido = sql("SET ROLE service_role; SELECT public.refresh_sicoob_order_sla_status();", check=False)
    checks["recalculo_restrito_ao_service_role"] = negado.returncode != 0 and permitido.returncode == 0

    resultado["checks"] = checks
    assert all(checks.values()), checks
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
