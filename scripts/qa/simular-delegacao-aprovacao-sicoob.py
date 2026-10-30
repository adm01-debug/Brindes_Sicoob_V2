"""Valida delegações de aprovação Sicoob em PostgreSQL 17 descartável."""
from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres


CONTAINER = "sicoob-delegacao-aprovacao-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-approval-policy-fixture.sql"
MIGRATIONS = [
    ROOT / "supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql",
    ROOT / "supabase/migrations/20260912110000_sicoob_order_status_events.sql",
    ROOT / "supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql",
    ROOT / "supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql",
    ROOT / "supabase/migrations/20260912160000_sicoob_approval_policy_snapshot.sql",
    ROOT / "supabase/migrations/20260927203000_sicoob_approval_delegations.sql",
    ROOT / "supabase/migrations/20260927204500_sicoob_delegated_authority_indicator.sql",
]

CREATOR = "10000000-0000-0000-0000-000000000001"
DELEGATOR = "10000000-0000-0000-0000-000000000002"
DELEGATE = "10000000-0000-0000-0000-000000000003"
OUTSIDER = "10000000-0000-0000-0000-000000000004"
SUPERVISOR = "10000000-0000-0000-0000-000000000005"
NO_AUTHORITY = "10000000-0000-0000-0000-000000000006"
COOP_A = "20000000-0000-0000-0000-000000000001"
COOP_B = "20000000-0000-0000-0000-000000000002"
PA_A = "30000000-0000-0000-0000-000000000001"
PA_B = "30000000-0000-0000-0000-000000000002"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(f"psql falhou: {response.stderr.strip()}")
    return response


def actor_sql(actor, statement, *, authenticated=False, check=True):
    role = "SET ROLE authenticated;" if authenticated else ""
    reset = "RESET ROLE;" if authenticated else ""
    return sql(
        f"{role}\nSET request.jwt.claim.sub='{actor}';\n{statement}\n{reset}",
        check=check,
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in {"SET", "RESET"}]
    if not values:
        raise RuntimeError("A consulta não retornou o valor esperado")
    return values[-1]


def rejected(response, fragment=None):
    assert response.returncode != 0, response.stdout
    if fragment:
        assert fragment in response.stderr, response.stderr


def create_order(order_id, creator=CREATOR, pa=PA_A, coop=COOP_A):
    sql(f"""
      INSERT INTO public.sicoob_orders
        (id, pa_id, cooperative_id, created_by, status, total_amount)
      VALUES ('{order_id}', '{pa}', '{coop}', '{creator}', 'pending', 800);
    """)
    return scalar(actor_sql(creator, f"""
      SELECT public.request_sicoob_order_approval(
        '{order_id}', 'pending', 'Solicitação sintética para validar delegação', 500, false
      );
    """))


result = {
    "ambiente": "PostgreSQL 17 descartável, sem rede e apenas com dados sintéticos",
    "migracoes": [str(item.relative_to(ROOT)) for item in MIGRATIONS],
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    for migration in MIGRATIONS:
        sql(migration.read_text())

    ids = [CREATOR, DELEGATOR, DELEGATE, OUTSIDER, SUPERVISOR, NO_AUTHORITY]
    sql(f"""
      INSERT INTO auth.users(id) VALUES {','.join(f"('{item}')" for item in ids)};
      INSERT INTO public.cooperativas(id, name) VALUES
        ('{COOP_A}', 'Cooperativa A'), ('{COOP_B}', 'Cooperativa B');
      INSERT INTO public.postos_atendimento(id, cooperativa_id, nome) VALUES
        ('{PA_A}', '{COOP_A}', 'PA A'), ('{PA_B}', '{COOP_B}', 'PA B');
      INSERT INTO public.pa_budgets(pa_id, ano, mes, verba_total, limite_alcada) VALUES
        ('{PA_A}', extract(year from now()), extract(month from now()), 100000, 500),
        ('{PA_B}', extract(year from now()), extract(month from now()), 100000, 500);
      INSERT INTO public.profiles(user_id, cooperativa_id, pa_id, is_active) VALUES
        ('{CREATOR}', '{COOP_A}', '{PA_A}', true),
        ('{DELEGATOR}', '{COOP_A}', '{PA_A}', true),
        ('{DELEGATE}', '{COOP_A}', '{PA_A}', true),
        ('{OUTSIDER}', '{COOP_B}', '{PA_B}', true),
        ('{SUPERVISOR}', null, null, true),
        ('{NO_AUTHORITY}', '{COOP_A}', '{PA_A}', true);
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('{DELEGATOR}', 'gerente_pa'), ('{DELEGATE}', 'comprador_pac'),
        ('{OUTSIDER}', 'comprador_pac'), ('{SUPERVISOR}', 'supervisor');
      INSERT INTO public.sicoob_approval_policies(
        cooperative_id, version, forbid_self_approval, require_active_membership
      ) VALUES
        ('{COOP_A}', 'delegacao-a-v1', true, true),
        ('{COOP_B}', 'delegacao-b-v1', true, true);
      GRANT USAGE ON SCHEMA public, auth TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      GRANT SELECT ON public.profiles, public.user_roles, public.sicoob_orders,
        public.sicoob_approval_requests TO authenticated;
    """)

    long_period = actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now() + interval '91 days',
        'Cobertura de férias programada'
      );
    """, check=False)
    rejected(long_period, "no máximo 90 dias")
    invalid_competence = actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['manage_users'], now(), now() + interval '1 day',
        'Cobertura de férias programada'
      );
    """, check=False)
    rejected(invalid_competence, "competências delegáveis")
    outside_scope = actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{OUTSIDER}', ARRAY['approve_order'], now(), now() + interval '1 day',
        'Cobertura de férias programada'
      );
    """, check=False)
    rejected(outside_scope, "mesmo PA")
    invalid_delegate_role = actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{NO_AUTHORITY}', ARRAY['approve_order'], now(), now() + interval '1 day',
        'Cobertura por usuário sem papel operacional'
      );
    """, check=False)
    rejected(invalid_delegate_role, "comprador_pac")
    without_authority = actor_sql(NO_AUTHORITY, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now() + interval '1 day',
        'Cobertura de férias programada'
      );
    """, check=False)
    rejected(without_authority, "não permite conceder")
    result["concessao"] = "prazo, competências, escopo e autoridade do delegante validados no servidor"

    delegation_id = scalar(actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order','reject_order'],
        now(), now() + interval '1 day', 'Cobertura formal de férias programadas'
      );
    """))
    candidates = scalar(actor_sql(DELEGATOR, """
      SELECT count(*) || '|' || min(user_id::text)
      FROM public.list_sicoob_approval_delegate_candidates();
    """))
    assert candidates == f"1|{DELEGATE}", candidates
    overlap = actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now() + interval '2 hours',
        'Segunda cobertura indevidamente sobreposta'
      );
    """, check=False)
    rejected(overlap, "sobreposta")
    sql(f"INSERT INTO public.user_roles(user_id, role) VALUES ('{DELEGATE}', 'gerente_pa');")
    reciprocal = actor_sql(DELEGATE, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATOR}', ARRAY['approve_order'], now(), now() + interval '2 hours',
        'Tentativa de delegação circular inválida'
      );
    """, check=False)
    rejected(reciprocal, "circular")
    sql(f"DELETE FROM public.user_roles WHERE user_id='{DELEGATE}' AND role='gerente_pa';")
    result["integridade"] = "sobreposição e ciclo recíproco foram bloqueados"

    order_valid = "40000000-0000-0000-0000-000000000001"
    request_valid = create_order(order_valid)
    assert scalar(actor_sql(DELEGATE, f"SELECT public.sicoob_current_actor_can_read_order('{order_valid}')::text;")) == "true"
    authority = scalar(actor_sql(DELEGATE, f"""
      SELECT public.sicoob_current_actor_approval_authority('{order_valid}', 'approve_order') ->> 'source';
    """))
    assert authority == "delegated", authority
    actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_valid}', '{order_valid}', '{DELEGATE}');")
    trace = scalar(sql(f"""
      SELECT r.status || '|' || o.status || '|' || r.approver_id || '|'
        || r.approval_delegation_id || '|' || r.authority_delegator_id || '|'
        || (a.details->>'authority_source') || '|' || (a.details->>'delegation_id')
      FROM public.sicoob_approval_requests r
      JOIN public.sicoob_orders o ON o.id=r.order_id
      JOIN public.sicoob_manager_audit a ON a.order_id=o.id AND a.action='approve'
      WHERE r.id='{request_valid}';
    """))
    assert trace == f"approved|confirmed|{DELEGATE}|{delegation_id}|{DELEGATOR}|delegated|{delegation_id}", trace
    result["decisao_delegada"] = "ator real, delegante, origem da autoridade e pedido aprovado ficaram correlacionados"

    actor_sql(DELEGATOR, f"SELECT public.revoke_sicoob_approval_delegation('{delegation_id}', 'Retorno antecipado do titular responsável');")
    revoked_state = scalar(sql(f"""
      SELECT (revoked_at IS NOT NULL)::text || '|' || revoked_by || '|' || revocation_reason
      FROM public.sicoob_approval_delegations WHERE id='{delegation_id}';
    """))
    assert revoked_state == f"true|{DELEGATOR}|Retorno antecipado do titular responsável", revoked_state
    direct_mutation = actor_sql(DELEGATE, f"""
      UPDATE public.sicoob_approval_delegations SET ends_at=now()+interval '5 days'
      WHERE id='{delegation_id}';
    """, authenticated=True, check=False)
    rejected(direct_mutation)

    revoked_id = scalar(actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now()+interval '1 day',
        'Cobertura formal revogada antes da decisão'
      );
    """))
    order_revoked = "40000000-0000-0000-0000-000000000002"
    request_revoked = create_order(order_revoked)
    actor_sql(DELEGATOR, f"SELECT public.revoke_sicoob_approval_delegation('{revoked_id}', 'Necessidade operacional encerrada antes da decisão');")
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_revoked}', '{order_revoked}', '{DELEGATE}');", check=False), "sem autoridade")
    result["revogacao"] = "revogação é imediata, auditável e invalida a decisão ainda na mesma sessão autenticada"

    expired_id = str(uuid.uuid4())
    sql(f"""
      INSERT INTO public.sicoob_approval_delegations(
        id, delegator_id, delegate_id, cooperative_id, pa_id, competencies,
        starts_at, ends_at, reason
      ) VALUES (
        '{expired_id}', '{DELEGATOR}', '{DELEGATE}', '{COOP_A}', '{PA_A}',
        ARRAY['approve_order'], now()-interval '2 hours', now()-interval '1 hour',
        'Cobertura sintética que já expirou'
      );
    """)
    order_expired = "40000000-0000-0000-0000-000000000003"
    request_expired = create_order(order_expired)
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_expired}', '{order_expired}', '{DELEGATE}');", check=False), "sem autoridade")
    result["expiracao"] = "vigência é reavaliada no instante da decisão, sem depender da interface"

    moved_id = scalar(actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now()+interval '1 day',
        'Cobertura para validar mudança posterior de unidade'
      );
    """))
    order_moved = "40000000-0000-0000-0000-000000000004"
    request_moved = create_order(order_moved)
    sql(f"UPDATE public.profiles SET pa_id='{PA_B}', cooperativa_id='{COOP_B}' WHERE user_id='{DELEGATE}';")
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_moved}', '{order_moved}', '{DELEGATE}');", check=False), "sem autoridade")
    sql(f"UPDATE public.profiles SET pa_id='{PA_A}', cooperativa_id='{COOP_A}' WHERE user_id='{DELEGATE}';")
    actor_sql(DELEGATOR, f"SELECT public.revoke_sicoob_approval_delegation('{moved_id}', 'Fim do ensaio de alteração de unidade');")

    role_id = scalar(actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now()+interval '1 day',
        'Cobertura para validar perda de papel do titular'
      );
    """))
    order_role = "40000000-0000-0000-0000-000000000005"
    request_role = create_order(order_role)
    sql(f"DELETE FROM public.user_roles WHERE user_id='{DELEGATOR}' AND role='gerente_pa';")
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_role}', '{order_role}', '{DELEGATE}');", check=False), "sem autoridade")
    sql(f"INSERT INTO public.user_roles(user_id, role) VALUES ('{DELEGATOR}', 'gerente_pa');")
    actor_sql(DELEGATOR, f"SELECT public.revoke_sicoob_approval_delegation('{role_id}', 'Fim do ensaio de perda de autoridade');")
    result["revalidacao"] = "mudança de unidade do substituto e perda de autoridade do titular anulam o poder delegado"

    conflict_id = scalar(actor_sql(DELEGATOR, f"""
      SELECT public.create_sicoob_approval_delegation(
        '{DELEGATE}', ARRAY['approve_order'], now(), now()+interval '1 day',
        'Cobertura para validar conflito de interesses'
      );
    """))
    order_self_delegate = "40000000-0000-0000-0000-000000000006"
    request_self_delegate = create_order(order_self_delegate, creator=DELEGATE)
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_self_delegate}', '{order_self_delegate}', '{DELEGATE}');", check=False), "sem autoridade")
    order_self_delegator = "40000000-0000-0000-0000-000000000007"
    request_self_delegator = create_order(order_self_delegator, creator=DELEGATOR)
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_self_delegator}', '{order_self_delegator}', '{DELEGATE}');", check=False), "sem autoridade")
    order_other_scope = "40000000-0000-0000-0000-000000000008"
    request_other_scope = create_order(order_other_scope, pa=PA_B, coop=COOP_B)
    rejected(actor_sql(DELEGATE, f"SELECT public.approve_sicoob_order('{request_other_scope}', '{order_other_scope}', '{DELEGATE}');", check=False), "sem autoridade")
    actor_sql(DELEGATOR, f"SELECT public.revoke_sicoob_approval_delegation('{conflict_id}', 'Fim dos ensaios de conflito de interesses');")
    result["conflitos"] = "autoaprovação do substituto, conflito do delegante e pedido fora do escopo foram negados"

    acl = scalar(sql("""
      SELECT
        has_function_privilege('authenticated', 'public.create_sicoob_approval_delegation(uuid,text[],timestamptz,timestamptz,text)', 'EXECUTE') || '|'
        || has_function_privilege('anon', 'public.create_sicoob_approval_delegation(uuid,text[],timestamptz,timestamptz,text)', 'EXECUTE') || '|'
        || has_function_privilege('authenticated', 'public.resolve_sicoob_approval_authority(uuid,uuid,uuid,boolean,text)', 'EXECUTE') || '|'
        || has_function_privilege('authenticated', 'public.sicoob_actor_has_active_approval_delegation(uuid,uuid)', 'EXECUTE') || '|'
        || has_function_privilege('authenticated', 'public.list_sicoob_approval_delegate_candidates()', 'EXECUTE') || '|'
        || has_function_privilege('anon', 'public.list_sicoob_approval_delegate_candidates()', 'EXECUTE') || '|'
        || has_function_privilege('authenticated', 'public.sicoob_current_actor_approval_authority(uuid,text)', 'EXECUTE') || '|'
        || has_function_privilege('anon', 'public.sicoob_current_actor_approval_authority(uuid,text)', 'EXECUTE') || '|'
        || has_function_privilege('authenticated', 'public.validate_sicoob_approval_delegate_role()', 'EXECUTE');
    """))
    assert acl == "true|false|false|false|true|false|true|false|false", acl
    result["acl"] = "RPCs públicas mínimas; resolvedor e helper parametrizado permanecem privados"
    result["resultado"] = "aprovado"

    evidence = ROOT / "docs/execucao/evidencias/delegacao-aprovacao-sicoob.json"
    if evidence.exists():
        previous = json.loads(evidence.read_text())
        if previous.get("banco_canonico_verificado") is True:
            for field in (
                "banco_canonico_verificado", "projeto_canonico", "postgres_remoto",
                "aplicacao_remota", "deploy_aplicacao",
            ):
                result[field] = previous[field]
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
