"""Valida guardas de aprovação Sicoob em PostgreSQL descartável e sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid


CONTAINER = "sicoob-politica-aprovacao-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-approval-policy-fixture.sql"
MIGRATIONS = [
    ROOT / "supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql",
    ROOT / "supabase/migrations/20260912110000_sicoob_order_status_events.sql",
    ROOT / "supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql",
    ROOT / "supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql",
]

CREATOR = "11111111-1111-1111-1111-111111111111"
PA_MANAGER = "22222222-2222-2222-2222-222222222222"
INACTIVE_MANAGER = "33333333-3333-3333-3333-333333333333"
SELF_MANAGER = "44444444-4444-4444-4444-444444444444"
SUPERVISOR = "55555555-5555-5555-5555-555555555555"
COOPERATIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
LOW_ORDER = "cccccccc-cccc-cccc-cccc-cccccccccccc"
HIGH_ORDER = "dddddddd-dddd-dddd-dddd-dddddddddddd"
SELF_ORDER = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
INACTIVE_ORDER = "ffffffff-ffff-ffff-ffff-ffffffffffff"
ESCALATED_ORDER = "99999999-9999-9999-9999-999999999999"
DIRECT_LOW_ORDER = "aaaaaaaa-1111-1111-1111-111111111111"


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
    "migracoes": [str(migration.relative_to(ROOT)) for migration in MIGRATIONS],
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
    for migration in MIGRATIONS:
        sql(migration.read_text())

    legacy_trigger_count = scalar(sql("""
      SELECT count(*)
        FROM pg_trigger
       WHERE tgrelid = 'public.sicoob_approval_requests'::regclass
         AND tgname = 'on_approval_request_created'
         AND NOT tgisinternal;
    """))
    assert legacy_trigger_count == "0", legacy_trigger_count

    rpc_privileges = scalar(sql("""
      SELECT
        has_function_privilege('authenticated', 'public.prepare_sicoob_order_confirmation(uuid, text, text)', 'EXECUTE')::text
        || '|' || has_function_privilege('anon', 'public.prepare_sicoob_order_confirmation(uuid, text, text)', 'EXECUTE')::text
        || '|' || has_function_privilege('authenticated', 'public.reject_sicoob_order_without_approval(uuid, text, text)', 'EXECUTE')::text
        || '|' || has_function_privilege('anon', 'public.reject_sicoob_order_without_approval(uuid, text, text)', 'EXECUTE')::text;
    """))
    assert rpc_privileges == "true|false|true|false", rpc_privileges

    sql(f"""
      INSERT INTO public.cooperativas (id, name) VALUES ('{COOPERATIVE}', 'Cooperativa sintética');
      INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, limite_alcada)
      VALUES ('{PA}', EXTRACT(YEAR FROM now()), EXTRACT(MONTH FROM now()), 10000, 500);
      INSERT INTO public.profiles (user_id, cooperativa_id, pa_id, is_active) VALUES
        ('{CREATOR}', '{COOPERATIVE}', '{PA}', true),
        ('{PA_MANAGER}', '{COOPERATIVE}', '{PA}', true),
        ('{INACTIVE_MANAGER}', '{COOPERATIVE}', '{PA}', false),
        ('{SELF_MANAGER}', '{COOPERATIVE}', '{PA}', true),
        ('{SUPERVISOR}', NULL, NULL, true);
      INSERT INTO public.user_roles (user_id, role) VALUES
        ('{PA_MANAGER}', 'gerente_pa'),
        ('{INACTIVE_MANAGER}', 'gerente_pa'),
        ('{SELF_MANAGER}', 'gerente_pa'),
        ('{SUPERVISOR}', 'supervisor');
      INSERT INTO public.sicoob_approval_policies (
        cooperative_id, version, forbid_self_approval, require_active_membership
      ) VALUES ('{COOPERATIVE}', 'coop-v2026.1', true, true);
      INSERT INTO public.sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount) VALUES
        ('{LOW_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 100),
        ('{HIGH_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{SELF_ORDER}', '{PA}', '{COOPERATIVE}', '{SELF_MANAGER}', 'pending', 800),
        ('{INACTIVE_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{ESCALATED_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{DIRECT_LOW_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 100);
      INSERT INTO public.sicoob_order_items (order_id, product_name, quantity, unit_price, total_price)
      VALUES ('{HIGH_ORDER}', 'Caneca sintética', 1, 800, 800);
    """)

    actor_sql(CREATOR, f"""
      SELECT public.prepare_sicoob_order_confirmation(
        '{LOW_ORDER}', 'pending', 'Preparado dentro da alçada local'
      );
    """)
    low_prepared = scalar(sql(f"""
      SELECT status || '|' || approval_policy_version || '|'
        || (SELECT count(*) FROM public.sicoob_approval_requests WHERE order_id = '{LOW_ORDER}')
      FROM public.sicoob_orders WHERE id = '{LOW_ORDER}';
    """))
    assert low_prepared == "waiting_approval|coop-v2026.1|0", low_prepared
    low_frozen = sql(f"UPDATE public.sicoob_orders SET total_amount = 101 WHERE id = '{LOW_ORDER}';", check=False)
    direct_request = actor_sql(CREATOR, f"""
      INSERT INTO public.sicoob_approval_requests (
        order_id, requester_id, request_reason, amount_at_request, threshold_at_request
      ) VALUES ('{LOW_ORDER}', '{CREATOR}', 'Tentativa de inserção sem RPC formal', 100, 500);
    """, check=False)
    assert low_frozen.returncode != 0 and "Pedido preparado" in low_frozen.stderr, low_frozen.stderr
    assert direct_request.returncode != 0 and "RPC formal" in direct_request.stderr, direct_request.stderr

    bypass_rpc = actor_sql(CREATOR, f"""
      SELECT public.transition_sicoob_order_status(
        '{LOW_ORDER}', 'waiting_approval', 'confirmed', 'tentativa de pular alçada'
      );
    """, check=False)
    assert bypass_rpc.returncode != 0 and "RPC específica" in bypass_rpc.stderr
    bypass_direct = sql(f"UPDATE public.sicoob_orders SET status = 'confirmed' WHERE id = '{LOW_ORDER}';", check=False)
    assert bypass_direct.returncode != 0 and "decisão formal" in bypass_direct.stderr

    actor_sql(PA_MANAGER, f"SELECT public.confirm_sicoob_order('{LOW_ORDER}', 'waiting_approval');")
    low_confirmed = scalar(sql(f"""
      SELECT status || '|' || approved_by::text || '|'
        || (SELECT verba_consumida::text FROM public.pa_budgets WHERE pa_id = '{PA}')
      FROM public.sicoob_orders WHERE id = '{LOW_ORDER}';
    """))
    assert low_confirmed == f"confirmed|{PA_MANAGER}|100.00", low_confirmed
    actor_sql(PA_MANAGER, f"SELECT public.confirm_sicoob_order('{DIRECT_LOW_ORDER}', 'pending');")
    direct_confirmed = scalar(sql(f"""
      SELECT o.status || '|' || o.approved_by::text || '|'
        || (SELECT count(*) FROM public.sicoob_order_history
              WHERE order_id = '{DIRECT_LOW_ORDER}'
                AND previous_status = 'pending' AND new_status = 'waiting_approval') || '|'
        || (SELECT count(*) FROM public.sicoob_order_history
              WHERE order_id = '{DIRECT_LOW_ORDER}'
                AND previous_status = 'waiting_approval' AND new_status = 'confirmed') || '|'
        || (SELECT verba_consumida::text FROM public.pa_budgets WHERE pa_id = '{PA}')
      FROM public.sicoob_orders o
      WHERE o.id = '{DIRECT_LOW_ORDER}';
    """))
    assert direct_confirmed == f"confirmed|{PA_MANAGER}|1|1|200.00", direct_confirmed
    result["dentro_da_alcada"] = "preparação formal, confirmação do gestor e débito único validados; confirmação iniciada em pending registra as duas etapas na mesma transação"
    result["acesso_rpc"] = "as RPCs novas são executáveis por authenticated e indisponíveis para anon"

    request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{HIGH_ORDER}', 'pending', 'Campanha regional acima da alçada prevista', 1, false
      );
    """))
    request_snapshot = scalar(sql(f"""
      SELECT r.amount_at_request || '|' || r.threshold_at_request || '|'
        || (r.metadata ->> 'approval_policy_version') || '|'
        || o.status || '|' || o.approval_policy_version
      FROM public.sicoob_approval_requests r
      JOIN public.sicoob_orders o ON o.id = r.order_id
      WHERE r.id = '{request_id}';
    """))
    assert request_snapshot == "800.00|500.00|coop-v2026.1|waiting_approval|coop-v2026.1", request_snapshot

    frozen_total = sql(f"UPDATE public.sicoob_orders SET total_amount = 801 WHERE id = '{HIGH_ORDER}';", check=False)
    frozen_item = sql(f"UPDATE public.sicoob_order_items SET quantity = 2 WHERE order_id = '{HIGH_ORDER}';", check=False)
    frozen_request = sql(f"UPDATE public.sicoob_approval_requests SET amount_at_request = 1 WHERE id = '{request_id}';", check=False)
    direct_approver = sql(f"UPDATE public.sicoob_approval_requests SET approver_id = '{PA_MANAGER}' WHERE id = '{request_id}';", check=False)
    assert frozen_total.returncode != 0 and "aprovação pendente" in frozen_total.stderr, frozen_total.stderr
    assert frozen_item.returncode != 0 and "aprovação pendente" in frozen_item.stderr, frozen_item.stderr
    assert frozen_request.returncode != 0 and "imutáveis" in frozen_request.stderr, frozen_request.stderr
    assert direct_approver.returncode != 0 and "aprovador só pode" in direct_approver.stderr, direct_approver.stderr

    actor_sql(PA_MANAGER, f"SELECT public.approve_sicoob_order('{request_id}', '{HIGH_ORDER}', '{PA_MANAGER}');")
    high_approved = scalar(sql(f"""
      SELECT r.status || '|' || o.status || '|'
        || (SELECT count(*) FROM public.workspace_notifications
              WHERE metadata ->> 'order_id' = '{HIGH_ORDER}'
                AND metadata ->> 'new_status' = 'confirmed')
      FROM public.sicoob_approval_requests r
      JOIN public.sicoob_orders o ON o.id = r.order_id
      WHERE r.id = '{request_id}';
    """))
    assert high_approved == "approved|confirmed|1", high_approved
    result["solicitacao_formal"] = "alçada é derivada do orçamento do PA; valor, itens e dados submetidos ficam congelados; gatilho legado removido"

    self_request_id = scalar(actor_sql(SELF_MANAGER, f"""
      SELECT public.request_sicoob_order_approval(
        '{SELF_ORDER}', 'pending', 'Pedido do próprio gestor para teste de impedimento', 500, false
      );
    """))
    self_approval = actor_sql(SELF_MANAGER, f"""
      SELECT public.approve_sicoob_order('{self_request_id}', '{SELF_ORDER}', '{SELF_MANAGER}');
    """, check=False)
    assert self_approval.returncode != 0 and "não permite decidir o próprio pedido" in self_approval.stderr

    inactive_request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{INACTIVE_ORDER}', 'pending', 'Pedido para validar vínculo revogado do aprovador', 500, false
      );
    """))
    inactive_approval = actor_sql(INACTIVE_MANAGER, f"""
      SELECT public.approve_sicoob_order('{inactive_request_id}', '{INACTIVE_ORDER}', '{INACTIVE_MANAGER}');
    """, check=False)
    assert inactive_approval.returncode != 0 and "vínculo ativo" in inactive_approval.stderr
    result["impedimentos"] = "autoaprovação e vínculo inativo foram recusados no servidor"

    escalated_request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{ESCALATED_ORDER}', 'pending', 'Solicitação inicial que exige validação superior', 500, false
      );
    """))
    escalated_same_id = scalar(actor_sql(PA_MANAGER, f"""
      SELECT public.request_sicoob_order_approval(
        '{ESCALATED_ORDER}', 'waiting_approval', 'Escalação para decisão da Diretoria responsável', 500, true
      );
    """))
    assert escalated_same_id == escalated_request_id
    escalation = scalar(sql(f"""
      SELECT o.status || '|' || count(*) || '|' || max(r.metadata ->> 'level')
      FROM public.sicoob_orders o
      JOIN public.sicoob_approval_requests r ON r.order_id = o.id
      WHERE o.id = '{ESCALATED_ORDER}'
      GROUP BY o.status;
    """))
    assert escalation == "escalated_to_board|1|board", escalation
    pa_cannot_board = actor_sql(PA_MANAGER, f"""
      SELECT public.approve_sicoob_order('{escalated_request_id}', '{ESCALATED_ORDER}', '{PA_MANAGER}');
    """, check=False)
    assert pa_cannot_board.returncode != 0 and "fora da alçada" in pa_cannot_board.stderr
    actor_sql(SUPERVISOR, f"""
      SELECT public.approve_sicoob_order('{escalated_request_id}', '{ESCALATED_ORDER}', '{SUPERVISOR}');
    """)
    result["escalacao"] = "a mesma solicitação é elevada sem duplicação; somente Central ativa decide"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/politica-aprovacao-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
