"""Valida a migração financeira em PostgreSQL descartável e sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid
from postgres_ready import wait_for_postgres

CONTAINER = "sicoob-verba-atomica-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql"
FIXTURE = ROOT / "tests/scenarios/sql/verba-atomica-fixture.sql"
PA = "00000000-0000-4000-8000-000000000001"
COOP = "00000000-0000-4000-8000-000000000010"
ACTOR = "00000000-0000-4000-8000-000000000020"
OUTSIDER = "00000000-0000-4000-8000-000000000021"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    # O runner pode aceitar o primeiro pg_isready enquanto o processo ainda
    # conclui a inicialização. O psql usa código 2 apenas para falha de conexão;
    # erros SQL usam outro código e não devem ser repetidos.
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
        raise RuntimeError(
            f"psql falhou com código {response.returncode}: {response.stderr.strip()}"
        )
    return response


def actor_sql(actor, statement, *, check=True):
    return sql(f"SET request.jwt.claim.sub = '{actor}';\n{statement}", check=check)


result = {
    "ambiente": "PostgreSQL 17.6 descartável, --network none; somente dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:17.6-alpine",
    ])
    wait_for_postgres(command, CONTAINER)

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(f"""
      INSERT INTO pa_budgets (pa_id, ano, mes, verba_total, limite_alcada)
      VALUES ('{PA}', EXTRACT(YEAR FROM now()), EXTRACT(MONTH FROM now()), 1000, 500);
      INSERT INTO sicoob_orders (id, pa_id, cooperative_id, total_amount)
      VALUES ('00000000-0000-4000-8000-000000000101', '{PA}', '{COOP}', 100);
      UPDATE sicoob_orders SET status='pending' WHERE id='00000000-0000-4000-8000-000000000101';
      UPDATE sicoob_orders SET status='waiting_approval' WHERE id='00000000-0000-4000-8000-000000000101';
      UPDATE sicoob_orders SET status='confirmed' WHERE id='00000000-0000-4000-8000-000000000101';
      UPDATE sicoob_orders SET status='confirmed' WHERE id='00000000-0000-4000-8000-000000000101';
      UPDATE sicoob_orders SET status='logistic' WHERE id='00000000-0000-4000-8000-000000000101';
    """)
    once = sql("SELECT verba_consumida::text FROM pa_budgets;").stdout.strip()
    assert once == "100.00", once
    immutable = sql(
        "UPDATE sicoob_orders SET total_amount=101 WHERE id='00000000-0000-4000-8000-000000000101';",
        check=False,
    )
    assert immutable.returncode != 0 and "não permite alterar" in immutable.stderr
    sql("UPDATE sicoob_orders SET status='cancelled' WHERE id='00000000-0000-4000-8000-000000000101';")
    refunded = sql("SELECT verba_consumida::text FROM pa_budgets;").stdout.strip()
    assert refunded == "0.00", refunded
    result["idempotencia"] = {"apos_confirmar_e_avancar": once, "apos_cancelar": refunded, "imutabilidade": "validada"}

    sql(f"""
      INSERT INTO sicoob_orders (id, pa_id, cooperative_id, status, total_amount) VALUES
      ('00000000-0000-4000-8000-000000000102', '{PA}', '{COOP}', 'waiting_approval', 600),
      ('00000000-0000-4000-8000-000000000103', '{PA}', '{COOP}', 'waiting_approval', 600);
    """)
    concurrent = []
    for order in ("102", "103"):
        concurrent.append(subprocess.Popen(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        ))
        concurrent[-1].stdin.write(
            f"UPDATE sicoob_orders SET status='confirmed' WHERE id='00000000-0000-4000-8000-000000000{order}';"
        )
        concurrent[-1].stdin.close()
    statuses = []
    for process in concurrent:
        process.wait(timeout=20)
        statuses.append(process.returncode)
    consumed = sql("SELECT verba_consumida::text FROM pa_budgets;").stdout.strip()
    confirmed = sql("SELECT count(*) FROM sicoob_orders WHERE id IN ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000103') AND status='confirmed';").stdout.strip()
    assert sorted(statuses) == [0, 3], statuses
    assert consumed == "600.00" and confirmed == "1", (consumed, confirmed)
    result["concorrencia"] = {"retornos": sorted(statuses), "debito": consumed, "pedidos_confirmados": int(confirmed)}

    sql(f"""
      UPDATE sicoob_orders SET status='cancelled' WHERE status='confirmed';
      UPDATE pa_budgets SET verba_consumida=0;
      INSERT INTO profiles (user_id, pa_id, cooperativa_id) VALUES
        ('{ACTOR}', '{PA}', '{COOP}'),
        ('{OUTSIDER}', '00000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000098');
      INSERT INTO user_roles (user_id, role) VALUES ('{ACTOR}', 'gerente_pa'), ('{OUTSIDER}', 'gerente_pa');
      INSERT INTO sicoob_orders (id, pa_id, cooperative_id, status, total_amount)
      VALUES ('00000000-0000-4000-8000-000000000104', '{PA}', '{COOP}', 'waiting_approval', 200);
      INSERT INTO sicoob_approval_requests (id, order_id, requester_id)
      VALUES ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000104', '{OUTSIDER}');
    """)
    spoof = actor_sql(ACTOR, f"SELECT approve_sicoob_order('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000104','{OUTSIDER}');", check=False)
    assert spoof.returncode != 0 and "Identidade do aprovador inválida" in spoof.stderr
    outside = actor_sql(OUTSIDER, f"SELECT approve_sicoob_order('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000104','{OUTSIDER}');", check=False)
    assert outside.returncode != 0 and "fora da alçada" in outside.stderr
    actor_sql(ACTOR, f"SELECT approve_sicoob_order('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000104','{ACTOR}');")
    state = sql("SELECT r.status || '|' || o.status || '|' || b.verba_consumida::text FROM sicoob_approval_requests r JOIN sicoob_orders o ON o.id=r.order_id JOIN pa_budgets b ON b.pa_id=o.pa_id WHERE r.id='00000000-0000-4000-8000-000000000204';").stdout.strip()
    assert state == "approved|confirmed|200.00", state
    repeated = actor_sql(ACTOR, f"SELECT approve_sicoob_order('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000104','{ACTOR}');", check=False)
    assert repeated.returncode != 0 and "já decidida" in repeated.stderr
    result["aprovacao"] = {"identidade_forjada": "bloqueada", "fora_de_escopo": "bloqueada", "estado": state, "repeticao": "bloqueada"}

    sql(f"""
      INSERT INTO sicoob_orders (id, pa_id, cooperative_id, status, total_amount) VALUES
      ('00000000-0000-4000-8000-000000000105', '{PA}', '{COOP}', 'waiting_approval', 250),
      ('00000000-0000-4000-8000-000000000106', '{PA}', '{COOP}', 'waiting_approval', 550);
    """)
    actor_sql(ACTOR, "SELECT confirm_sicoob_order('00000000-0000-4000-8000-000000000105','waiting_approval');")
    direct_state = sql("SELECT status || '|' || approved_by::text FROM sicoob_orders WHERE id='00000000-0000-4000-8000-000000000105';").stdout.strip()
    assert direct_state == f"confirmed|{ACTOR}", direct_state
    stale = actor_sql(ACTOR, "SELECT confirm_sicoob_order('00000000-0000-4000-8000-000000000105','waiting_approval');", check=False)
    assert stale.returncode != 0 and "pedido mudou" in stale.stderr.lower()
    over_limit = actor_sql(ACTOR, "SELECT confirm_sicoob_order('00000000-0000-4000-8000-000000000106','waiting_approval');", check=False)
    assert over_limit.returncode != 0, over_limit.stderr
    assert sql("SELECT status FROM sicoob_orders WHERE id='00000000-0000-4000-8000-000000000106';").stdout.strip() == "waiting_approval"
    result["confirmacao_direta"] = {
        "dentro_da_alcada": direct_state,
        "estado_desatualizado": "bloqueado",
        "acima_da_alcada": "bloqueado",
    }

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/verba-atomica.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
