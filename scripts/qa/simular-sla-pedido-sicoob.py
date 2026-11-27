#!/usr/bin/env python3
"""Valida o ciclo de vida do SLA do pedido Sicoob em PostgreSQL isolado e sem rede.

Duas fases: a primeira usa `postgres:16-alpine` para o ciclo de vida (prazo, recálculo,
limiares e aviso ao solicitante); a segunda sobe a imagem oficial da Supabase com
`pg_cron` pré-carregado para provar o agendamento de 15 min, que no Postgres puro é
pulado em silêncio pelo bloco `DO` da migration.
"""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import start_supabase_postgres, wait_for_postgres

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
    "ambiente": "PostgreSQL descartável (postgres:16-alpine e imagem oficial da Supabase com pg_cron), --network none; somente dados sintéticos",
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

    # O gatilho canônico de eventos (produção: 20260912110000_sicoob_order_status_events.sql)
    # é AFTER UPDATE OF status, sla_status e só avisa na transição para 'critical'.
    # O probe abaixo repete esse contrato de colunas e de transição para provar que
    # a mudança de SLA chega ao solicitante, sem copiar o corpo de 160 linhas do
    # gatilho real (que depende de workspace_notifications, profiles e eventos).
    sql("""
      CREATE TABLE public.sla_notification_probe (
        order_id uuid NOT NULL,
        sla_status text NOT NULL,
        at timestamptz NOT NULL DEFAULT now()
      );
      CREATE FUNCTION public.probe_sla_notification() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.sla_status = 'critical' AND OLD.sla_status IS DISTINCT FROM 'critical' THEN
          INSERT INTO public.sla_notification_probe(order_id, sla_status)
          VALUES (NEW.id, NEW.sla_status);
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER tr_record_sicoob_order_status_event
      AFTER UPDATE OF status, sla_status ON public.sicoob_orders
      FOR EACH ROW EXECUTE FUNCTION public.probe_sla_notification();
    """)

    def avisos(order_id):
        return int(
            scalar(
                "SELECT count(*) FROM public.sla_notification_probe "
                f"WHERE order_id = '{order_id}';"
            )
        )

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

    # 5. O tempo passa sem escrita no pedido (gatilhos desligados na simulação):
    #    o recálculo por rotina classifica e avisa o solicitante.
    sql(
        "SET session_replication_role = replica;"
        f"UPDATE public.sicoob_orders SET sla_deadline = now() - interval '30 minutes' WHERE id = '{PENDENTE}';"
        "SET session_replication_role = DEFAULT;"
    )
    assert estado(PENDENTE).split("|")[1] == "normal", estado(PENDENTE)
    alterados = scalar("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_marca_vencido_como_critico"] = (
        int(alterados) >= 1 and estado(PENDENTE).split("|")[1] == "critical"
    )
    checks["recalculo_avisa_solicitante"] = avisos(PENDENTE) == 1

    sql(
        "SET session_replication_role = replica;"
        f"UPDATE public.sicoob_orders SET sla_deadline = now() + interval '1 hour' WHERE id = '{PENDENTE}';"
        "SET session_replication_role = DEFAULT;"
    )
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_marca_proximo_do_limite_como_alerta"] = estado(PENDENTE).split("|")[1] == "warning"

    # 6. Limiar documentado (80% do prazo = 9 h 36 min restantes de 48 h), tanto na
    #    escrita do pedido quanto no recálculo agendado.
    sql(f"UPDATE public.sicoob_orders SET sla_deadline = now() + interval '5 hours' WHERE id = '{PENDENTE}';")
    checks["escrita_marca_80_por_cento_como_alerta"] = estado(PENDENTE).split("|")[1] == "warning"
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_nao_rebaixa_alerta_dos_80_por_cento"] = estado(PENDENTE).split("|")[1] == "warning"
    sql(f"UPDATE public.sicoob_orders SET sla_deadline = now() + interval '10 hours' WHERE id = '{PENDENTE}';")
    checks["escrita_antes_dos_80_por_cento_segue_normal"] = estado(PENDENTE).split("|")[1] == "normal"

    # 7. Pedido que já estava vencido no backfill avisa o solicitante uma única vez.
    checks["backfill_avisa_uma_vez"] = avisos(PARADO) == 1

    # 8. Pedido encerrado não é reclassificado pela rotina.
    antes = estado(CONFIRMADO)
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    checks["recalculo_nao_toca_pedido_encerrado"] = estado(CONFIRMADO) == antes

    # 9. A rotina é do serviço, não do usuário final.
    negado = sql(
        "SET ROLE authenticated; SELECT public.refresh_sicoob_order_sla_status();", check=False
    )
    permitido = sql("SET ROLE service_role; SELECT public.refresh_sicoob_order_sla_status();", check=False)
    checks["recalculo_restrito_ao_service_role"] = negado.returncode != 0 and permitido.returncode == 0

    resultado["checks"] = checks
    assert all(checks.values()), checks
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)

# ── Fase 2: o agendamento que roda em produção (pg_cron da imagem da Supabase) ─
# A fase 1 usa postgres:16-alpine, que não traz pg_cron: o bloco DO da migration
# é pulado silenciosamente, então o CI provava apenas a chamada manual da rotina.
CRON_CONTAINER = "sicoob-sla-cron-" + uuid.uuid4().hex[:10]
cron_checks = {}
try:
    cron_image = start_supabase_postgres(
        command,
        CRON_CONTAINER,
        postgres_args=(
            "-c", "shared_preload_libraries=pg_cron,pg_net",
            "-c", "cron.database_name=postgres",
        ),
    )
    wait_for_postgres(command, CRON_CONTAINER)

    def cron_sql(statement, *, check=True):
        response = command(
            ["docker", "exec", "-i", CRON_CONTAINER, "psql", "-U", "supabase_admin",
             "-d", "postgres", "-XqAt", "-v", "ON_ERROR_STOP=1"],
            stdin=statement,
            check=False,
        )
        if check and response.returncode != 0:
            raise RuntimeError(f"psql (pg_cron) falhou: {response.stderr.strip()}")
        return response

    def cron_scalar(statement):
        return cron_sql(statement).stdout.strip()

    cron_sql("CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;")
    cron_sql(FIXTURE.read_text())
    cron_sql(MIGRATION.read_text())

    job = "WHERE jobname = 'sicoob-refresh-order-sla'"
    cron_checks["agendamento_registrado"] = cron_scalar(f"SELECT count(*) FROM cron.job {job};") == "1"
    cron_checks["agendamento_cada_15_minutos"] = cron_scalar(f"SELECT schedule FROM cron.job {job};") == "*/15 * * * *"
    cron_checks["agendamento_ativo"] = cron_scalar(f"SELECT active::text FROM cron.job {job};") == "true"
    cron_checks["agendamento_chama_recalculo"] = (
        cron_scalar(f"SELECT command FROM cron.job {job};")
        == "SELECT public.refresh_sicoob_order_sla_status();"
    )
    cron_checks["agendamento_sem_segredo"] = (
        cron_scalar(f"SELECT bool_and(command !~* '(apikey|bearer|eyJ)')::text FROM cron.job {job};") == "true"
    )
    cron_checks["comando_agendado_executa"] = cron_scalar(
        "DO $$ BEGIN EXECUTE (SELECT command FROM cron.job WHERE jobname = 'sicoob-refresh-order-sla'); END $$;"
        "SELECT 'ok';"
    ) == "ok"
    cron_sql(MIGRATION.read_text())
    cron_checks["reaplicacao_nao_duplica_job"] = cron_scalar(f"SELECT count(*) FROM cron.job {job};") == "1"
finally:
    command(["docker", "rm", "-f", CRON_CONTAINER], check=False)

resultado["checks"].update(cron_checks)
resultado["agendamento"] = {"imagem": cron_image, "pg_cron": True}
assert all(cron_checks.values()), cron_checks
assert all(resultado["checks"].values()), resultado["checks"]
print(json.dumps(resultado, ensure_ascii=False, indent=2))
