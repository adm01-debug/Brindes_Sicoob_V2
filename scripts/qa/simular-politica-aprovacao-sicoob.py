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
    ROOT / "supabase/migrations/20260912160000_sicoob_approval_policy_snapshot.sql",
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
REJECTED_ORDER = "aaaaaaaa-2222-2222-2222-222222222222"
CANCELLED_ORDER = "aaaaaaaa-3333-3333-3333-333333333333"
LEGACY_DUP_ORDER = "aaaaaaaa-4444-4444-4444-444444444444"


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


def rls_actor_sql(actor, statement, *, check=True):
    return sql(f"SET ROLE authenticated;\nSET request.jwt.claim.sub = '{actor}';\n{statement}\nRESET ROLE;", check=check)


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
    sql(f"""
      ALTER TABLE public.sicoob_orders DISABLE TRIGGER trigger_sicoob_order_flow_intelligence;
      INSERT INTO public.sicoob_orders (id, created_by, status, total_amount)
      VALUES ('{LEGACY_DUP_ORDER}', '{CREATOR}', 'pending', 10);
      ALTER TABLE public.sicoob_orders ENABLE TRIGGER trigger_sicoob_order_flow_intelligence;
      ALTER TABLE public.sicoob_approval_requests DISABLE TRIGGER on_approval_request_created;
      INSERT INTO public.sicoob_approval_requests
        (order_id, requester_id, request_reason, amount_at_request, threshold_at_request, created_at)
      VALUES
        ('{LEGACY_DUP_ORDER}', '{CREATOR}', 'Legado duplicado um', 10, 100, now() - interval '1 minute'),
        ('{LEGACY_DUP_ORDER}', '{CREATOR}', 'Legado duplicado dois', 10, 100, now());
      ALTER TABLE public.sicoob_approval_requests ENABLE TRIGGER on_approval_request_created;
    """)
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
    flow_trigger_count = scalar(sql("""
      SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.sicoob_orders'::regclass
        AND tgname = 'trigger_sicoob_order_flow_intelligence'
        AND NOT tgisinternal;
    """))
    assert flow_trigger_count == "0", flow_trigger_count
    normalized_pending = scalar(sql(f"""
      SELECT count(*) FILTER (WHERE status='pending') || '|'
        || count(*) FILTER (WHERE status='rejected')
      FROM public.sicoob_approval_requests WHERE order_id='{LEGACY_DUP_ORDER}';
    """))
    assert normalized_pending == "1|1", normalized_pending

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
        ('{INACTIVE_MANAGER}', 'gerente_pa'), ('{INACTIVE_MANAGER}', 'supervisor'),
        ('{SELF_MANAGER}', 'gerente_pa'),
        ('{SUPERVISOR}', 'supervisor');
      INSERT INTO public.sicoob_approval_policies (
        cooperative_id, version, forbid_self_approval, require_active_membership
      ) VALUES ('{COOPERATIVE}', 'coop-v2026.1', true, true);
      INSERT INTO public.sicoob_approval_policies (
        cooperative_id, version, effective_from, forbid_self_approval, require_active_membership
      ) VALUES (NULL, 'global-v2026.9', now() + interval '1 millisecond', false, false);
      INSERT INTO public.sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount) VALUES
        ('{LOW_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 100),
        ('{HIGH_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{SELF_ORDER}', '{PA}', '{COOPERATIVE}', '{SELF_MANAGER}', 'pending', 800),
        ('{INACTIVE_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{ESCALATED_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{REJECTED_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{CANCELLED_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 800),
        ('{DIRECT_LOW_ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'pending', 100);
      INSERT INTO public.sicoob_order_items (order_id, product_name, quantity, unit_price, total_price)
      VALUES ('{HIGH_ORDER}', 'Caneca sintética', 1, 800, 800);
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT SELECT ON public.user_roles, public.profiles TO authenticated;
      GRANT SELECT, UPDATE ON public.sicoob_approval_policies TO authenticated;
    """)

    inactive_policy_change = rls_actor_sql(INACTIVE_MANAGER, f"""
      UPDATE public.sicoob_approval_policies SET is_active=false
      WHERE cooperative_id='{COOPERATIVE}';
    """, check=False)
    assert inactive_policy_change.returncode == 0
    assert scalar(sql(f"SELECT is_active::text FROM public.sicoob_approval_policies WHERE cooperative_id='{COOPERATIVE}';")) == "true"

    actor_sql(CREATOR, f"""
      SELECT public.prepare_sicoob_order_confirmation(
        '{LOW_ORDER}', 'pending', 'Preparado dentro da alçada local'
      );
    """)
    low_prepared = scalar(sql(f"""
      SELECT status || '|' || approval_policy_version || '|'
        || (approval_policy_snapshot ->> 'version') || '|'
        || (SELECT count(*) FROM public.sicoob_approval_requests WHERE order_id = '{LOW_ORDER}')
      FROM public.sicoob_orders WHERE id = '{LOW_ORDER}';
    """))
    assert low_prepared == "waiting_approval|coop-v2026.1|coop-v2026.1|0", low_prepared
    pending_policy_tamper = sql(f"""
      UPDATE public.sicoob_orders
         SET approval_policy_version = 'forjada'
       WHERE id = '{HIGH_ORDER}';
    """, check=False)
    assert pending_policy_tamper.returncode != 0 and "transição formal" in pending_policy_tamper.stderr
    low_frozen = sql(f"UPDATE public.sicoob_orders SET total_amount = 101 WHERE id = '{LOW_ORDER}';", check=False)
    direct_request = actor_sql(CREATOR, f"""
      INSERT INTO public.sicoob_approval_requests (
        order_id, requester_id, request_reason, amount_at_request, threshold_at_request
      ) VALUES ('{LOW_ORDER}', '{CREATOR}', 'Tentativa de inserção sem RPC formal', 100, 500);
    """, check=False)
    assert low_frozen.returncode != 0 and "Pedido submetido" in low_frozen.stderr, low_frozen.stderr
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
    confirmed_item_insert = sql(f"""
      INSERT INTO public.sicoob_order_items (order_id, product_name, quantity, unit_price, total_price)
      VALUES ('{LOW_ORDER}', 'Inclusão tardia', 1, 1, 1);
    """, check=False)
    assert confirmed_item_insert.returncode != 0 and "Pedido submetido" in confirmed_item_insert.stderr
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

    scope_change = sql(f"UPDATE public.sicoob_orders SET cooperative_id='{LEGACY_DUP_ORDER}' WHERE id='{HIGH_ORDER}';", check=False)
    period_change = sql(f"UPDATE public.sicoob_orders SET created_at=created_at + interval '1 month' WHERE id='{HIGH_ORDER}';", check=False)
    assert scope_change.returncode != 0 and "Pedido submetido" in scope_change.stderr
    assert period_change.returncode != 0 and "Pedido submetido" in period_change.stderr

    frozen_total = sql(f"UPDATE public.sicoob_orders SET total_amount = 801 WHERE id = '{HIGH_ORDER}';", check=False)
    frozen_item = sql(f"UPDATE public.sicoob_order_items SET quantity = 2 WHERE order_id = '{HIGH_ORDER}';", check=False)
    frozen_request = sql(f"UPDATE public.sicoob_approval_requests SET amount_at_request = 1 WHERE id = '{request_id}';", check=False)
    direct_approver = sql(f"UPDATE public.sicoob_approval_requests SET approver_id = '{PA_MANAGER}' WHERE id = '{request_id}';", check=False)
    assert frozen_total.returncode != 0 and "Pedido submetido" in frozen_total.stderr, frozen_total.stderr
    assert frozen_item.returncode != 0 and "Pedido submetido" in frozen_item.stderr, frozen_item.stderr
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
    reparent_confirmed_item = sql(f"""
      UPDATE public.sicoob_order_items
         SET order_id = '{SELF_ORDER}'
       WHERE order_id = '{HIGH_ORDER}';
    """, check=False)
    assert reparent_confirmed_item.returncode != 0 and "Pedido submetido" in reparent_confirmed_item.stderr
    policy_mutation = sql(f"""
      UPDATE public.sicoob_approval_policies
         SET forbid_self_approval = false
       WHERE cooperative_id = '{COOPERATIVE}';
    """, check=False)
    assert policy_mutation.returncode != 0 and "nova versão" in policy_mutation.stderr
    result["solicitacao_formal"] = "alçada é derivada do orçamento do PA; política específica prevalece, sua fotografia é imutável e valor/itens permanecem congelados após confirmação e em transferências"

    rejected_request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{REJECTED_ORDER}', 'pending', 'Campanha recusada na análise formal', 500, false
      );
    """))
    actor_sql(PA_MANAGER, f"""
      SELECT public.reject_sicoob_order(
        '{rejected_request_id}', '{REJECTED_ORDER}', '{PA_MANAGER}', 'Identidade visual fora do manual vigente'
      );
    """)
    rejected_history = scalar(sql(f"""
      SELECT r.status || '|' || o.status || '|' || h.comment
      FROM public.sicoob_approval_requests r
      JOIN public.sicoob_orders o ON o.id = r.order_id
      JOIN LATERAL (
        SELECT comment FROM public.sicoob_order_history
        WHERE order_id = o.id AND new_status = 'rejected'
        ORDER BY created_at DESC LIMIT 1
      ) h ON true
      WHERE r.id = '{rejected_request_id}';
    """))
    assert rejected_history == "rejected|rejected|Identidade visual fora do manual vigente", rejected_history
    result["rejeicao"] = "motivo da decisão formal propagado ao histórico canônico do pedido"

    cancelled_request_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.request_sicoob_order_approval(
        '{CANCELLED_ORDER}', 'pending', 'Solicitação que será cancelada formalmente', 500, false
      );
    """))
    actor_sql(CREATOR, f"""
      SELECT public.transition_sicoob_order_status(
        '{CANCELLED_ORDER}', 'waiting_approval', 'cancelled', 'Cancelado pelo solicitante'
      );
    """)
    cancelled_state = scalar(sql(f"""
      SELECT o.status || '|' || r.status || '|' || r.rejection_reason
      FROM public.sicoob_orders o JOIN public.sicoob_approval_requests r ON r.order_id=o.id
      WHERE r.id='{cancelled_request_id}';
    """))
    assert cancelled_state == "cancelled|rejected|Pedido cancelado: Cancelado pelo solicitante", cancelled_state
    reopen_request = sql(f"UPDATE public.sicoob_approval_requests SET status='pending' WHERE id='{cancelled_request_id}';", check=False)
    assert reopen_request.returncode != 0 and "decisão formal" in reopen_request.stderr
    result["cancelamento"] = "solicitação pendente encerrada atomicamente e reabertura direta bloqueada"

    self_request_id = scalar(actor_sql(SELF_MANAGER, f"""
      SELECT public.request_sicoob_order_approval(
        '{SELF_ORDER}', 'pending', 'Pedido do próprio gestor para teste de impedimento', 500, false
      );
    """))
    self_approval = actor_sql(SELF_MANAGER, f"""
      SELECT public.approve_sicoob_order('{self_request_id}', '{SELF_ORDER}', '{SELF_MANAGER}');
    """, check=False)
    assert self_approval.returncode != 0 and "não permite decidir o próprio pedido" in self_approval.stderr

    inactive_request = actor_sql(INACTIVE_MANAGER, f"""
      SELECT public.request_sicoob_order_approval(
        '{INACTIVE_ORDER}', 'pending', 'Tentativa com vínculo inativo no escopo', 500, false
      );
    """, check=False)
    assert inactive_request.returncode != 0 and "fora do escopo" in inactive_request.stderr
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
    sql(f"""
      UPDATE public.sicoob_approval_policies
         SET is_active = false, effective_until = now() + interval '1 minute'
       WHERE cooperative_id = '{COOPERATIVE}';
    """)
    frozen_policy = scalar(sql(f"""
      SELECT policy_version || '|'
        || forbid_self_approval::text || '|'
        || require_active_membership::text
        FROM public.get_sicoob_order_approval_policy('{HIGH_ORDER}');
    """))
    assert frozen_policy == "coop-v2026.1|true|true", frozen_policy
    result["escalacao"] = "a mesma solicitação é elevada sem duplicação; somente Central ativa decide"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/politica-aprovacao-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
