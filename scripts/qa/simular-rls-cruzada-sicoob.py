"""Prova o isolamento entre cooperativas e PAs no domínio de pedidos Sicoob."""
from pathlib import Path
import json
import subprocess
import time
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-rls-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-cross-cooperative-rls-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260927193000_sicoob_cross_cooperative_rls.sql"

COOP_A = "aaaaaaaa-0000-0000-0000-000000000001"
COOP_B = "bbbbbbbb-0000-0000-0000-000000000002"
PA_A = "aaaaaaaa-1000-0000-0000-000000000001"
PA_B = "bbbbbbbb-1000-0000-0000-000000000002"
MANAGER_A = "aaaaaaaa-2000-0000-0000-000000000001"
MANAGER_B = "bbbbbbbb-2000-0000-0000-000000000002"
BUYER_A = "aaaaaaaa-3000-0000-0000-000000000001"
CREATOR = "aaaaaaaa-4000-0000-0000-000000000001"
SUPERVISOR = "cccccccc-2000-0000-0000-000000000003"
ORDER_A = "aaaaaaaa-5000-0000-0000-000000000001"
ORDER_B = "bbbbbbbb-5000-0000-0000-000000000002"
APPROVAL_A = "aaaaaaaa-6000-0000-0000-000000000001"
APPROVAL_B = "bbbbbbbb-6000-0000-0000-000000000002"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command([
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
            "-v", "ON_ERROR_STOP=1", "-At",
        ], stdin=statement, check=False)
        if response.returncode != 2:
            break
        time.sleep(0.5)
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def actor_sql(actor, statement):
    return sql(
        "BEGIN; SET LOCAL ROLE authenticated; "
        f"SELECT set_config('request.jwt.claim.sub','{actor}',true); "
        f"{statement}; ROLLBACK;"
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line not in {"BEGIN", "SET", "ROLLBACK"}]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


result = {
    "ambiente": "PostgreSQL 17 descartável, --network none; somente dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(f"""
      INSERT INTO public.profiles(id,user_id,cooperativa_id,pa_id) VALUES
        ('{MANAGER_A}','{MANAGER_A}','{COOP_A}','{PA_A}'),
        ('{MANAGER_B}','{MANAGER_B}','{COOP_B}','{PA_B}'),
        ('{BUYER_A}','{BUYER_A}','{COOP_A}','{PA_A}'),
        ('{CREATOR}','{CREATOR}','{COOP_A}','{PA_A}'),
        ('{SUPERVISOR}','{SUPERVISOR}','{COOP_A}','{PA_A}');
      INSERT INTO public.user_roles VALUES
        ('{MANAGER_A}','gestor_compras'),('{MANAGER_B}','gestor_compras'),
        ('{BUYER_A}','comprador_pac'),('{SUPERVISOR}','supervisor');
      INSERT INTO public.sicoob_orders VALUES
        ('{ORDER_A}','{COOP_A}','{PA_A}','{CREATOR}'),
        ('{ORDER_B}','{COOP_B}','{PA_B}','{MANAGER_B}');
      INSERT INTO public.sicoob_order_items VALUES
        (gen_random_uuid(),'{ORDER_A}'),(gen_random_uuid(),'{ORDER_B}');
      INSERT INTO public.sicoob_order_history VALUES
        (gen_random_uuid(),'{ORDER_A}'),(gen_random_uuid(),'{ORDER_B}');
      INSERT INTO public.sicoob_order_item_logs VALUES
        (gen_random_uuid(),'{ORDER_A}'),(gen_random_uuid(),'{ORDER_B}');
      INSERT INTO public.sicoob_approval_requests(id,order_id,requester_id) VALUES
        ('{APPROVAL_A}','{ORDER_A}','{CREATOR}'),
        ('{APPROVAL_B}','{ORDER_B}','{MANAGER_B}');
    """)

    assert scalar(actor_sql(MANAGER_A, "SELECT count(*) FROM public.sicoob_orders")) == "1"
    assert scalar(actor_sql(MANAGER_B, "SELECT count(*) FROM public.sicoob_orders")) == "1"
    assert scalar(actor_sql(BUYER_A, "SELECT count(*) FROM public.sicoob_orders")) == "1"
    assert scalar(actor_sql(CREATOR, "SELECT count(*) FROM public.sicoob_orders")) == "1"
    assert scalar(actor_sql(SUPERVISOR, "SELECT count(*) FROM public.sicoob_orders")) == "2"
    assert scalar(actor_sql(MANAGER_A, f"SELECT count(*) FROM public.sicoob_orders WHERE id='{ORDER_B}'")) == "0"

    for table in ("sicoob_order_items", "sicoob_order_history", "sicoob_order_item_logs"):
        assert scalar(actor_sql(MANAGER_A, f"SELECT count(*) FROM public.{table}")) == "1"
        assert scalar(actor_sql(MANAGER_A, f"SELECT count(*) FROM public.{table} WHERE order_id='{ORDER_B}'")) == "0"

    assert scalar(actor_sql(MANAGER_A, "SELECT count(*) FROM public.sicoob_approval_requests")) == "1"
    assert scalar(actor_sql(MANAGER_A, f"SELECT count(*) FROM public.sicoob_approval_requests WHERE id='{APPROVAL_B}'")) == "0"
    assert scalar(actor_sql(MANAGER_A, f"UPDATE public.sicoob_approval_requests SET status='approved' WHERE id='{APPROVAL_B}'; SELECT count(*) FROM public.sicoob_approval_requests WHERE id='{APPROVAL_B}' AND status='approved'")) == "0"
    assert scalar(actor_sql(BUYER_A, f"UPDATE public.sicoob_approval_requests SET status='approved' WHERE id='{APPROVAL_A}'; SELECT count(*) FROM public.sicoob_approval_requests WHERE id='{APPROVAL_A}' AND status='approved'")) == "0"
    assert scalar(actor_sql(SUPERVISOR, f"UPDATE public.sicoob_approval_requests SET status='approved' WHERE id='{APPROVAL_B}'; SELECT count(*) FROM public.sicoob_approval_requests WHERE id='{APPROVAL_B}' AND status='approved'")) == "1"
    assert scalar(sql(f"SELECT status FROM public.sicoob_approval_requests WHERE id='{APPROVAL_B}'")) == "pending"

    sql(f"UPDATE public.profiles SET is_active=false WHERE user_id='{MANAGER_A}';")
    assert scalar(actor_sql(MANAGER_A, "SELECT count(*) FROM public.sicoob_orders")) == "0"

    assert scalar(sql("SELECT has_function_privilege('anon','public.sicoob_current_actor_can_read_order(uuid)','EXECUTE')::text")) == "false"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.sicoob_current_actor_can_read_order(uuid)','EXECUTE')::text")) == "true"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.sicoob_actor_can_manage_fulfillment(uuid,uuid)','EXECUTE')::text")) == "false"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.sicoob_actor_can_approve(uuid,uuid,boolean)','EXECUTE')::text")) == "false"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.sicoob_current_actor_can_approve_order(uuid,boolean)','EXECUTE')::text")) == "true"
    assert scalar(sql("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('sicoob_orders','sicoob_order_items','sicoob_order_history','sicoob_order_item_logs','sicoob_approval_requests') AND cmd='SELECT'")) == "5"
    result["cenario_s20"] = "gestores e comprador PA viram apenas o próprio escopo; UUID alheio, itens, histórico, logs e aprovação cruzada retornaram zero; perfil inativo perdeu acesso; supervisor manteve escopo global explícito"
    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/rls-cruzada-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
