"""Valida isolamento e autoridade de verbas em PostgreSQL descartável."""

from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-verbas-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/pa-budgets-authority-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql"
EVIDENCE = ROOT / "docs/execucao/evidencias/autoridade-verbas-sicoob.json"

COOP_A = "aaaaaaaa-0000-4000-8000-000000000001"
COOP_B = "bbbbbbbb-0000-4000-8000-000000000002"
PA_A = "aaaaaaaa-1000-4000-8000-000000000001"
PA_B = "bbbbbbbb-1000-4000-8000-000000000002"
GESTOR_A = "aaaaaaaa-2000-4000-8000-000000000001"
GESTOR_INATIVO = "aaaaaaaa-2000-4000-8000-000000000002"
GERENTE_A = "aaaaaaaa-3000-4000-8000-000000000001"
COMPRADOR_PA_A = "aaaaaaaa-3000-4000-8000-000000000002"
COMPRADOR_SINGULAR_A = "aaaaaaaa-3000-4000-8000-000000000003"
ADMIN = "cccccccc-4000-4000-8000-000000000001"
BUDGET_A = "aaaaaaaa-5000-4000-8000-000000000001"
BUDGET_B = "bbbbbbbb-5000-4000-8000-000000000002"
COOP_BUDGET_A = "aaaaaaaa-6000-4000-8000-000000000001"
COOP_BUDGET_B = "bbbbbbbb-6000-4000-8000-000000000002"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        [
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
            "-v", "ON_ERROR_STOP=1", "-Atq",
        ],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def as_actor(actor, statement, *, check=True):
    return sql(
        "BEGIN; SET LOCAL ROLE authenticated; "
        f"SELECT set_config('request.jwt.claim.sub','{actor}',true); "
        f"{statement}; COMMIT;",
        check=check,
    )


def scalar(response):
    ignored = {"BEGIN", "SET", "COMMIT", "ROLLBACK"}
    values = [line for line in response.stdout.splitlines() if line not in ignored]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


result = {
    "ambiente": "PostgreSQL 17 descartável, sem rede e com dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "banco_canonico_alterado": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())

    sql(f"""
      INSERT INTO public.profiles
        (id, user_id, cooperativa_id, pa_id, is_active, deleted_at)
      VALUES
        ('{GESTOR_A}', '{GESTOR_A}', '{COOP_A}', '{PA_A}', true, null),
        ('{GESTOR_INATIVO}', '{GESTOR_INATIVO}', '{COOP_A}', '{PA_A}', false, null),
        ('{GERENTE_A}', '{GERENTE_A}', '{COOP_A}', '{PA_A}', true, null),
        ('{COMPRADOR_PA_A}', '{COMPRADOR_PA_A}', '{COOP_A}', '{PA_A}', true, null),
        ('{COMPRADOR_SINGULAR_A}', '{COMPRADOR_SINGULAR_A}', '{COOP_A}', null, true, null),
        ('{ADMIN}', '{ADMIN}', null, null, true, null);
      INSERT INTO public.user_roles (user_id, role) VALUES
        ('{GESTOR_A}', 'gestor_compras'),
        ('{GESTOR_INATIVO}', 'gestor_compras'),
        ('{GERENTE_A}', 'gerente_pa'),
        ('{COMPRADOR_PA_A}', 'comprador_pac'),
        ('{COMPRADOR_SINGULAR_A}', 'comprador_singular'),
        ('{ADMIN}', 'admin');
      INSERT INTO public.postos_atendimento (id, cooperativa_id, is_active) VALUES
        ('{PA_A}', '{COOP_A}', true),
        ('{PA_B}', '{COOP_B}', true);
      INSERT INTO public.pa_budgets
        (id, pa_id, ano, mes, verba_total, verba_consumida, limite_alcada)
      VALUES
        ('{BUDGET_A}', '{PA_A}', 2026, 10, 1000, 100, 500),
        ('{BUDGET_B}', '{PA_B}', 2026, 10, 2000, 200, 700);
      INSERT INTO public.cooperativa_budgets
        (id, cooperativa_id, ano, mes, verba_total, limite_alcada)
      VALUES
        ('{COOP_BUDGET_A}', '{COOP_A}', 2026, 10, 5000, 1000),
        ('{COOP_BUDGET_B}', '{COOP_B}', 2026, 10, 9000, 2000);
    """)

    assert scalar(as_actor(GESTOR_A, "SELECT count(*) FROM public.pa_budgets")) == "1"
    assert scalar(as_actor(GESTOR_A, f"SELECT count(*) FROM public.pa_budgets WHERE id='{BUDGET_B}'")) == "0"
    assert scalar(as_actor(GESTOR_A, f"UPDATE public.pa_budgets SET verba_total=1100 WHERE id='{BUDGET_A}' RETURNING verba_total")) == "1100"
    assert scalar(as_actor(GESTOR_A, f"UPDATE public.pa_budgets SET verba_total=9000 WHERE id='{BUDGET_B}'; SELECT count(*) FROM public.pa_budgets WHERE id='{BUDGET_B}'")) == "0"

    assert scalar(as_actor(GERENTE_A, "SELECT count(*) FROM public.pa_budgets")) == "1"
    assert scalar(as_actor(GERENTE_A, f"UPDATE public.pa_budgets SET limite_alcada=99999 WHERE id='{BUDGET_A}'; SELECT limite_alcada FROM public.pa_budgets WHERE id='{BUDGET_A}'")) == "500"

    gestor_consumo = as_actor(
        GESTOR_A,
        f"UPDATE public.pa_budgets SET verba_consumida=999 WHERE id='{BUDGET_A}'",
        check=False,
    )
    gerente_consumo = as_actor(
        GERENTE_A,
        f"UPDATE public.pa_budgets SET verba_consumida=999 WHERE id='{BUDGET_A}'",
        check=False,
    )
    assert gestor_consumo.returncode != 0
    assert gerente_consumo.returncode != 0
    assert scalar(sql(f"SELECT verba_consumida FROM public.pa_budgets WHERE id='{BUDGET_A}'")) == "100"

    assert scalar(as_actor(GESTOR_INATIVO, "SELECT count(*) FROM public.pa_budgets")) == "0"
    inactive_role = scalar(as_actor(GESTOR_INATIVO, "SELECT public.is_gestor_compras()::text"))
    assert inactive_role == "false", repr(inactive_role)
    assert scalar(as_actor(ADMIN, "SELECT count(*) FROM public.pa_budgets")) == "2"
    assert scalar(as_actor(COMPRADOR_PA_A, "SELECT count(*) FROM public.pa_budgets")) == "1"
    assert scalar(as_actor(COMPRADOR_SINGULAR_A, "SELECT count(*) FROM public.pa_budgets")) == "1"

    forged_scope = as_actor(
        GESTOR_A,
        f"UPDATE public.profiles SET cooperativa_id='{COOP_B}', pa_id='{PA_B}', "
        "approval_threshold=999999, is_active=false "
        f"WHERE user_id='{GESTOR_A}'",
        check=False,
    )
    assert forged_scope.returncode != 0
    assert scalar(sql(
        f"SELECT cooperativa_id::text||'|'||pa_id::text||'|'||is_active::text "
        f"FROM public.profiles WHERE user_id='{GESTOR_A}'"
    )) == f"{COOP_A}|{PA_A}|true"
    assert scalar(as_actor(
        GESTOR_A,
        f"UPDATE public.profiles SET full_name='Gestor QA' WHERE user_id='{GESTOR_A}' "
        "RETURNING full_name",
    )) == "Gestor QA"
    assert scalar(as_actor(
        ADMIN,
        f"UPDATE public.profiles SET approval_threshold=1500 WHERE user_id='{GESTOR_A}' "
        "RETURNING approval_threshold",
    )) == "1500"

    assert scalar(as_actor(GESTOR_A, "SELECT count(*) FROM public.cooperativa_budgets")) == "1"
    assert scalar(as_actor(
        GESTOR_A,
        f"SELECT count(*) FROM public.cooperativa_budgets WHERE id='{COOP_BUDGET_B}'",
    )) == "0"
    assert scalar(as_actor(
        GESTOR_A,
        f"UPDATE public.cooperativa_budgets SET verba_total=5500 WHERE id='{COOP_BUDGET_A}' RETURNING verba_total",
    )) == "5500"
    assert scalar(as_actor(
        GESTOR_A,
        f"UPDATE public.cooperativa_budgets SET verba_total=99999 WHERE id='{COOP_BUDGET_B}'; "
        f"SELECT count(*) FROM public.cooperativa_budgets WHERE id='{COOP_BUDGET_B}'",
    )) == "0"
    cross_coop_insert = as_actor(
        GESTOR_A,
        f"INSERT INTO public.cooperativa_budgets "
        f"(cooperativa_id,ano,mes,verba_total) VALUES ('{COOP_B}',2026,11,500)",
        check=False,
    )
    assert cross_coop_insert.returncode != 0
    change_identity = as_actor(
        GESTOR_A,
        f"UPDATE public.cooperativa_budgets SET cooperativa_id='{COOP_B}' "
        f"WHERE id='{COOP_BUDGET_A}'",
        check=False,
    )
    assert change_identity.returncode != 0
    assert scalar(as_actor(ADMIN, "SELECT count(*) FROM public.cooperativa_budgets")) == "2"

    pa_delete = as_actor(
        GESTOR_A,
        f"DELETE FROM public.pa_budgets WHERE id='{BUDGET_A}'",
        check=False,
    )
    coop_delete = as_actor(
        ADMIN,
        f"DELETE FROM public.cooperativa_budgets WHERE id='{COOP_BUDGET_A}'",
        check=False,
    )
    assert pa_delete.returncode != 0
    assert coop_delete.returncode != 0
    assert scalar(sql(f"SELECT count(*) FROM public.pa_budgets WHERE id='{BUDGET_A}'")) == "1"
    assert scalar(sql(
        f"SELECT count(*) FROM public.cooperativa_budgets WHERE id='{COOP_BUDGET_A}'"
    )) == "1"

    insert_with_consumption = as_actor(
        GESTOR_A,
        f"INSERT INTO public.pa_budgets (pa_id,ano,mes,verba_total,verba_consumida) VALUES ('{PA_A}',2026,11,500,10)",
        check=False,
    )
    assert insert_with_consumption.returncode != 0
    assert scalar(as_actor(
        GESTOR_A,
        f"INSERT INTO public.pa_budgets (pa_id,ano,mes,verba_total,limite_alcada) VALUES ('{PA_A}',2026,11,500,200) RETURNING verba_consumida",
    )) == "0"

    result.update({
        "gestor_ve_somente_cooperativa": True,
        "gestor_nao_altera_outra_cooperativa": True,
        "gerente_nao_aumenta_propria_alcada": True,
        "consumo_direto_bloqueado": True,
        "gestor_inativo_sem_acesso": True,
        "administrador_ativo_preservado": True,
        "insercao_inicia_consumo_em_zero": True,
        "compradores_legitimos_leem_verba_do_escopo": True,
        "autoalteracao_de_escopo_do_perfil_bloqueada": True,
        "verba_cooperativa_isolada": True,
        "identidade_verba_cooperativa_imutavel": True,
        "exclusao_direta_de_verba_bloqueada": True,
        "resultado": "aprovado",
    })
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
