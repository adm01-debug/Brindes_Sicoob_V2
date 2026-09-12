"""Valida os eventos transacionais de status Sicoob em PostgreSQL isolado e sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid

CONTAINER = "sicoob-eventos-status-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260912110000_sicoob_order_status_events.sql"
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-order-status-events-fixture.sql"
CREATOR = "11111111-1111-1111-1111-111111111111"
PA_MANAGER = "22222222-2222-2222-2222-222222222222"
SUPERVISOR = "33333333-3333-3333-3333-333333333333"
OUTSIDER = "44444444-4444-4444-4444-444444444444"
COOPERATIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ORDER_A = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ORDER_B = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ORDER_C = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
ORDER_D = "ffffffff-ffff-ffff-ffff-ffffffffffff"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=statement,
            check=False,
        )
        if response.returncode != 2:
            break
        time.sleep(0.5)
    if check and response.returncode != 0:
        raise RuntimeError(f"psql falhou com código {response.returncode}: {response.stderr.strip()}")
    return response


def actor_sql(actor, statement, *, check=True):
    return sql(f"SET request.jwt.claim.sub = '{actor}';\n{statement}", check=check)


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line != "SET"]
    if not values:
        raise RuntimeError("A consulta não retornou o valor esperado")
    return values[-1]


result = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:16-alpine",
    ])
    for _ in range(120):
        if command(["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"], check=False).returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError("PostgreSQL descartável não iniciou")

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    legacy_trigger_count = scalar(sql("""
      SELECT count(*)
        FROM pg_trigger
       WHERE tgrelid = 'public.sicoob_approval_requests'::regclass
         AND tgname = 'on_approval_request_created'
         AND NOT tgisinternal;
    """))
    assert legacy_trigger_count == "0", legacy_trigger_count
    sql(f"""
      INSERT INTO public.profiles (user_id, cooperativa_id, pa_id) VALUES
        ('{CREATOR}', '{COOPERATIVE}', '{PA}'),
        ('{PA_MANAGER}', '{COOPERATIVE}', '{PA}'),
        ('{SUPERVISOR}', NULL, NULL),
        ('{OUTSIDER}', '{COOPERATIVE}', NULL);
      INSERT INTO public.user_roles (user_id, role) VALUES
        ('{PA_MANAGER}', 'gerente_pa'),
        ('{SUPERVISOR}', 'supervisor'),
        ('{OUTSIDER}', 'vendedor');
      INSERT INTO public.sicoob_orders (id, cooperative_id, pa_id, created_by, status, total_amount) VALUES
        ('{ORDER_A}', '{COOPERATIVE}', '{PA}', '{CREATOR}', 'pending', 1250),
        ('{ORDER_B}', '{COOPERATIVE}', '{PA}', '{CREATOR}', 'pending', 15000),
        ('{ORDER_C}', '{COOPERATIVE}', '{PA}', '{CREATOR}', 'pending', 900),
        ('{ORDER_D}', '{COOPERATIVE}', '{PA}', '{CREATOR}', 'confirmed', 900);
    """)

    actor_sql(CREATOR, f"""
      SELECT public.transition_sicoob_order_status(
        '{ORDER_A}', 'pending', 'waiting_approval', 'Campanha institucional aprovada para análise'
      );
    """)
    assert sql(f"""
      SELECT user_id::text || '|' || previous_status || '|' || new_status || '|' || comment
      FROM public.sicoob_order_history WHERE order_id = '{ORDER_A}';
    """).stdout.strip() == (
        f"{CREATOR}|pending|waiting_approval|Campanha institucional aprovada para análise"
    )
    recipients = sql(f"""
      SELECT string_agg(user_id::text, ',' ORDER BY user_id::text)
      FROM public.workspace_notifications
      WHERE metadata ->> 'order_id' = '{ORDER_A}';
    """).stdout.strip()
    assert recipients == f"{PA_MANAGER},{SUPERVISOR}", recipients
    result["transicao_comum"] = {
        "historico": "gravado com ator, estado anterior, estado novo e comentário",
        "destinatarios": "gerente do PA e supervisor; o ator não recebe aviso redundante",
    }

    before_counts = scalar(sql(f"""
      SELECT (SELECT count(*) FROM public.sicoob_order_history WHERE order_id = '{ORDER_A}')
        || '|' || (SELECT count(*) FROM public.workspace_notifications WHERE metadata ->> 'order_id' = '{ORDER_A}');
    """))
    actor_sql(CREATOR, f"SELECT public.transition_sicoob_order_status('{ORDER_A}', 'waiting_approval', 'waiting_approval', NULL);")
    after_counts = scalar(sql(f"""
      SELECT (SELECT count(*) FROM public.sicoob_order_history WHERE order_id = '{ORDER_A}')
        || '|' || (SELECT count(*) FROM public.workspace_notifications WHERE metadata ->> 'order_id' = '{ORDER_A}');
    """))
    assert before_counts == after_counts == "1|2", (before_counts, after_counts)
    result["repeticao_idempotente"] = "reenvio com o status já aplicado não duplicou histórico nem aviso"

    request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{ORDER_B}', 'pending', 'Investimento necessário para a campanha regional', 5000, false
      );
    """))
    approval = scalar(sql(f"""
      SELECT requester_id::text || '|' || amount_at_request || '|' || threshold_at_request || '|'
        || status || '|' || (SELECT status FROM public.sicoob_orders WHERE id = '{ORDER_B}')
      FROM public.sicoob_approval_requests WHERE id = '{request_id}';
    """))
    assert approval == f"{CREATOR}|15000|5000|pending|waiting_approval", approval
    history_comment = scalar(sql(f"""
      SELECT comment FROM public.sicoob_order_history WHERE order_id = '{ORDER_B}';
    """))
    assert history_comment == "Solicitação de aprovação: Investimento necessário para a campanha regional"
    approval_notification = scalar(sql(f"""
      SELECT string_agg(
        user_id::text || '|' || (metadata ->> 'source') || '|' || (metadata ->> 'order_id') || '|'
          || (metadata ->> 'previous_status') || '|' || (metadata ->> 'new_status') || '|'
          || (metadata ->> 'actor_id'),
        ',' ORDER BY user_id::text
      )
      FROM public.workspace_notifications
      WHERE metadata ->> 'order_id' = '{ORDER_B}';
    """))
    expected_notification = (
      f"{PA_MANAGER}|sicoob_order_status|{ORDER_B}|pending|waiting_approval|{CREATOR},"
      f"{SUPERVISOR}|sicoob_order_status|{ORDER_B}|pending|waiting_approval|{CREATOR}"
    )
    assert approval_notification == expected_notification, approval_notification
    result["solicitacao_de_alcada"] = "pedido, solicitação, histórico e avisos canônicos completos gravados no mesmo commit; gatilho legado removido"

    concurrent = []
    for _ in range(2):
        process = subprocess.Popen(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        process.stdin.write(
            f"SET request.jwt.claim.sub = '{CREATOR}';\n"
            f"SELECT public.transition_sicoob_order_status('{ORDER_C}', 'pending', 'waiting_approval', 'concorrência');"
        )
        process.stdin.close()
        concurrent.append(process)
    statuses = []
    for process in concurrent:
        process.wait(timeout=20)
        statuses.append(process.returncode)
    assert sorted(statuses) == [0, 3], statuses
    assert scalar(sql(f"SELECT count(*) FROM public.sicoob_order_history WHERE order_id = '{ORDER_C}';")) == "1"
    result["concorrencia"] = {"retornos_psql": sorted(statuses), "historico_resultante": "um único evento"}

    sql("""
      CREATE FUNCTION public.test_fail_workspace_notification()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('test.force_notification_failure', true) = 'on' THEN
          RAISE EXCEPTION 'falha intencional de notificação';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER test_fail_workspace_notification
      BEFORE INSERT ON public.workspace_notifications
      FOR EACH ROW EXECUTE FUNCTION public.test_fail_workspace_notification();
    """)
    failed_notification = actor_sql(PA_MANAGER, f"""
      SET test.force_notification_failure = 'on';
      SELECT public.transition_sicoob_order_status('{ORDER_D}', 'confirmed', 'logistic', 'teste de rollback');
    """, check=False)
    assert failed_notification.returncode != 0 and "falha intencional de notificação" in failed_notification.stderr
    assert scalar(sql(f"SELECT status FROM public.sicoob_orders WHERE id = '{ORDER_D}';")) == "confirmed"
    assert scalar(sql(f"SELECT count(*) FROM public.sicoob_order_history WHERE order_id = '{ORDER_D}';")) == "0"
    result["falha_de_notificacao"] = "a falha reverteu status e histórico; não há alteração parcial"

    unauthenticated = sql(
        f"SELECT public.transition_sicoob_order_status('{ORDER_A}', 'waiting_approval', 'confirmed', NULL);",
        check=False,
    )
    assert unauthenticated.returncode != 0 and "Usuário não autenticado" in unauthenticated.stderr
    result["autenticacao"] = "RPC recusou chamada sem identidade autenticada"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/eventos-status-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
