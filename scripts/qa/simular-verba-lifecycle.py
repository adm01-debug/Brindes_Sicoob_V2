#!/usr/bin/env python3
"""Valida o ciclo de verba em quatro estados (PLB-29/32) em PostgreSQL descartável."""
from pathlib import Path
import json
from decimal import Decimal
import subprocess
import time
import uuid
from postgres_ready import wait_for_postgres

CONTAINER = "sicoob-verba-life-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql"
FIXTURE = ROOT / "tests/scenarios/sql/verba-lifecycle-fixture.sql"
PA_A = "00000000-0000-4000-8000-000000000001"
PA_B = "00000000-0000-4000-8000-000000000002"
COOP_A = "00000000-0000-4000-8000-000000000010"
COOP_B = "00000000-0000-4000-8000-000000000011"
GESTOR_A = "00000000-0000-4000-8000-000000000020"
GESTOR_B = "00000000-0000-4000-8000-000000000021"
ADMIN = "00000000-0000-4000-8000-000000000022"
# Le o pedido da Coop A pelo escopo, mas nao tem papel de verba.
LEITOR = "00000000-0000-4000-8000-000000000023"
# Gestor Singular (comprador_singular) da Coop A.
SINGULAR = "00000000-0000-4000-8000-000000000024"
ORDER = "00000000-0000-4000-8000-000000000101"


def carregar_backfill():
    """Extrai o statement do backfill da propria migration, sem copia divergente."""
    texto = MIGRATION.read_text()
    inicio = texto.index("WITH snapshot AS MATERIALIZED")
    fim = texto.index("\n\n-- Converte status do pedido no estado da verba", inicio)
    return texto[inicio:fim].rstrip()


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
             "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=statement,
            check=False,
        )
        if response.returncode != 2:
            break
        time.sleep(0.5)
    if check and response.returncode != 0:
        raise RuntimeError(f"psql falhou ({response.returncode}): {response.stderr.strip()}")
    return response


def scalar(statement):
    return sql(statement).stdout.strip()


def actor_sql(actor, statement, *, check=True):
    return sql(f"SET request.jwt.claim.sub = '{actor}';\n{statement}", check=check)


def estados():
    row = scalar(
        "SELECT verba_planejada || '|' || verba_reservada || '|' || verba_comprometida"
        " || '|' || verba_consumida FROM pa_budgets"
        f" WHERE pa_id = '{PA_A}' AND ano = EXTRACT(YEAR FROM now())"
        " AND mes = EXTRACT(MONTH FROM now());"
    )
    planejado, reservado, comprometido, consumido = row.split("|")
    return {
        "planejado": planejado,
        "reservado": reservado,
        "comprometido": comprometido,
        "consumido": consumido,
    }


def move(order, status):
    return sql(f"UPDATE sicoob_orders SET status = '{status}' WHERE id = '{order}';")


def must_fail(statement, needle):
    response = sql(statement, check=False)
    assert response.returncode != 0, ("deveria falhar", statement)
    assert needle.lower() in response.stderr.lower(), (needle, response.stderr)
    return response.stderr.strip().splitlines()[0]


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

    # ---- 1. Backfill do consumo legado -------------------------------------
    inicial = estados()
    assert inicial == {"planejado": "1000.00", "reservado": "0.00",
                       "comprometido": "0.00", "consumido": "150.00"}, inicial
    livro_legado = scalar(
        "SELECT count(*) || '|' || COALESCE(sum(valor), 0) FROM pa_budget_entries"
        " WHERE tipo = 'ajuste' AND order_id IS NULL;"
    )
    # O pedido 102 (delivered, 60) ja estava consumido antes do livro: o
    # backfill atribui os 60 a ele e o resto do agregado (90) fica sem pedido.
    assert livro_legado == "1|90.00", livro_legado
    atribuido = scalar(
        "SELECT estado || '|' || valor FROM pa_budget_entries"
        " WHERE order_id = '00000000-0000-4000-8000-000000000102';"
    )
    assert atribuido == "consumido|60.00", atribuido
    result["backfill"] = {
        "agregado": inicial["consumido"],
        "livro_sem_pedido": livro_legado,
        "livro_do_pedido_legado": atribuido,
    }

    # ---- 2. Rascunho não reserva -------------------------------------------
    assert estados()["reservado"] == "0.00"
    move(ORDER, "pending")
    assert estados()["reservado"] == "0.00"

    # ---- 3. waiting_approval reserva ---------------------------------------
    move(ORDER, "waiting_approval")
    reservado = estados()
    assert reservado["reservado"] == "100.00", reservado
    assert reservado["consumido"] == "150.00", reservado
    restante = scalar(f"SELECT audit_remaining_budget FROM sicoob_orders WHERE id = '{ORDER}';")
    assert restante == "750.00", restante

    # Idempotência: repetir a mesma posição não duplica o evento.
    move(ORDER, "waiting_approval")
    assert estados()["reservado"] == "100.00", estados()

    # ---- 4. confirmed compromete -------------------------------------------
    move(ORDER, "confirmed")
    comprometido = estados()
    assert comprometido["reservado"] == "0.00", comprometido
    assert comprometido["comprometido"] == "100.00", comprometido

    # ---- 5. delivered consome ----------------------------------------------
    move(ORDER, "logistic")
    move(ORDER, "completed")
    final = estados()
    assert final["comprometido"] == "0.00", final
    assert final["consumido"] == "250.00", final
    result["ciclo"] = {"apos_reservar": reservado, "comprometido": comprometido, "consumido": final}

    # ---- 6. Imutabilidade do pedido consumido ------------------------------
    result["pedido_consumido"] = {
        "alterar_valor": must_fail(
            f"UPDATE sicoob_orders SET total_amount = 999 WHERE id = '{ORDER}';",
            "não permite alterar",
        ),
        "alterar_pa": must_fail(
            f"UPDATE sicoob_orders SET pa_id = '{PA_B}' WHERE id = '{ORDER}';",
            "não permite alterar",
        ),
    }

    # ---- 7. Livro imutável -------------------------------------------------
    result["livro_imutavel"] = must_fail(
        "UPDATE pa_budget_entries SET valor = 1;", "imutável"
    )

    # ---- 8. Saldo insuficiente --------------------------------------------
    insuficiente = "00000000-0000-4000-8000-000000000201"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{insuficiente}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 900);"
    )
    result["saldo_insuficiente"] = must_fail(
        f"UPDATE sicoob_orders SET status = 'waiting_approval' WHERE id = '{insuficiente}';",
        "saldo insuficiente",
    )
    assert scalar(f"SELECT status FROM sicoob_orders WHERE id = '{insuficiente}';") == "draft"
    assert estados()["reservado"] == "0.00", estados()

    # ---- 9. Competência fechada -------------------------------------------
    fechavel = "00000000-0000-4000-8000-000000000202"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{fechavel}', '{PA_B}', '{COOP_B}', '{GESTOR_B}', 'draft', 100);"
    )
    actor_sql(
        ADMIN,
        "SELECT pa_budget_close_competence("
        f"'{PA_B}', EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, true);",
    )
    result["competencia_fechada"] = {
        "motivo": must_fail(
            f"UPDATE sicoob_orders SET status = 'waiting_approval' WHERE id = '{fechavel}';",
            "fechada",
        )
    }
    reaberta = actor_sql(
        ADMIN,
        "SELECT pa_budget_close_competence("
        f"'{PA_B}', EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, false);",
    )
    assert reaberta.returncode == 0, reaberta.stderr
    move(fechavel, "waiting_approval")
    result["competencia_fechada"]["apos_reabrir"] = "reservado"

    # ---- 10. Isolamento entre cooperativas ---------------------------------
    alheio = "00000000-0000-4000-8000-000000000203"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{alheio}', '{PA_B}', '{COOP_B}', '{GESTOR_B}', 'draft', 50);"
    )
    result["isolamento"] = {
        "verba_de_outra_cooperativa": must_fail(
            f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
            f"SELECT pa_budget_id_for_order('{alheio}');",
            "sem permissao",
        ),
        "conciliar_pa_alheio": must_fail(
            f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
            f"SELECT * FROM pa_budget_reconcile('{PA_B}', EXTRACT(YEAR FROM now())::int,"
            " EXTRACT(MONTH FROM now())::int);",
            "sem permissao",
        ),
        "centro_de_custo_alheio": None,
    }

    # ---- 11. Rateio: fecha em 100% e revalida quando o total muda ----------
    center_a = sql(
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_A}', 'CC-01', 'Marketing');\nSELECT id FROM cost_centers"
        " WHERE cooperativa_id = '" + COOP_A + "' AND codigo = 'CC-01';"
    ).stdout.split()[-1]
    rateio = "00000000-0000-4000-8000-000000000204"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{rateio}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    sql(
        "INSERT INTO pa_budget_allocations (order_id, cost_center_id, valor, percentual)"
        f" VALUES ('{rateio}', '{center_a}', 200, 100);"
    )
    move(rateio, "pending")
    # O pedido submetido nao aceita trocar de valor (freeze do fluxo de
    # aprovacao), entao o ajuste financeiro real acontece no rateio — e a entrada
    # na verba revalida a soma contra o total do pedido.
    sql(f"UPDATE pa_budget_allocations SET valor = 150 WHERE order_id = '{rateio}';")
    parcial_motivo = must_fail(
        f"UPDATE sicoob_orders SET status = 'waiting_approval' WHERE id = '{rateio}';",
        "soma",
    )
    assert scalar(f"SELECT status FROM sicoob_orders WHERE id = '{rateio}';") == "pending"
    sql(f"UPDATE pa_budget_allocations SET valor = 200 WHERE order_id = '{rateio}';")
    move(rateio, "waiting_approval")
    reservado_rateio = scalar(
        f"SELECT verba_reservada FROM pa_budgets WHERE pa_id = '{PA_A}'"
        " AND ano = EXTRACT(YEAR FROM now()) AND mes = EXTRACT(MONTH FROM now());"
    )
    assert reservado_rateio == "200.00", reservado_rateio
    result["rateio"] = {"rateio_defasado": parcial_motivo, "reservado": reservado_rateio}

    # ---- 12. Reconciliacao fecha com o livro -------------------------------
    divergente = scalar(
        "SELECT bool_or(divergente) FROM pa_budget_reconcile("
        f"'{PA_A}', EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int);"
    )
    assert divergente == "f", divergente
    result["reconciliacao"] = "agregado igual ao livro"

    # ---- 13. RLS: centro de custo e livro so no escopo do ator -------------
    sql(
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_B}', 'CC-02', 'Operacoes');"
    )
    actor_sql(ADMIN, "SET ROLE authenticated;\nSELECT 1;")
    via_gestor_a = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\nSET ROLE authenticated;\n"
        "SELECT COALESCE(string_agg(codigo, ',' ORDER BY codigo), '') FROM cost_centers;"
    ).stdout.strip().splitlines()[-1]
    via_gestor_b = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_B}';\nSET ROLE authenticated;\n"
        "SELECT COALESCE(string_agg(codigo, ',' ORDER BY codigo), '') FROM cost_centers;"
    ).stdout.strip().splitlines()[-1]
    assert via_gestor_a == "CC-01", via_gestor_a
    assert via_gestor_b == "CC-02", via_gestor_b
    result["rls"] = {"centros_visiveis_gestor_a": via_gestor_a,
                     "centros_visiveis_gestor_b": via_gestor_b}

    # ---- 14. RPC atomica de rateio (achado Devin #2) -----------------------
    atomico = "00000000-0000-4000-8000-000000000205"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{atomico}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    linhas = json.dumps([
        {"cost_center_id": center_a, "valor": 120, "percentual": 60},
    ])
    criado = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{atomico}', '{linhas}'::jsonb);"
    ).stdout.strip().splitlines()[-1]
    assert criado == "1", criado
    duplicado_cc = must_fail(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT * FROM pa_budget_replace_allocations('{atomico}', "
        f"'[{{\"cost_center_id\":\"{center_a}\",\"valor\":100,\"percentual\":50}},"
        f"{{\"cost_center_id\":\"{center_a}\",\"valor\":100,\"percentual\":50}}]'::jsonb);",
        "uma unica vez",
    )
    # A rejeicao nao pode ter apagado o rateio anterior.
    mantido = scalar(
        f"SELECT count(*) || '|' || COALESCE(sum(valor), 0) FROM pa_budget_allocations"
        f" WHERE order_id = '{atomico}';"
    )
    assert mantido == "1|120.00", mantido
    result["rateio_atomico"] = {"linhas": criado, "duplicado": duplicado_cc, "preservado": mantido}

    # A duplicata e barrada antes do DELETE; para provar o rollback a falha
    # precisa acontecer depois dele. Valor nao numerico passa por todas as
    # checagens previas (centro valido, sem duplicata) e estoura no CAST do
    # INSERT, ja com o rateio anterior apagado dentro da transacao.
    falha_apos_delete = must_fail(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT * FROM pa_budget_replace_allocations('{atomico}', "
        f"'[{{\"cost_center_id\":\"{center_a}\",\"valor\":\"nao-e-numero\",\"percentual\":60}}]'::jsonb);",
        "numeric",
    )
    restaurado = scalar(
        f"SELECT count(*) || '|' || COALESCE(sum(valor), 0) FROM pa_budget_allocations"
        f" WHERE order_id = '{atomico}';"
    )
    assert restaurado == "1|120.00", restaurado
    result["rateio_atomico"]["rollback_apos_delete"] = restaurado
    result["rateio_atomico"]["erro_insercao"] = falha_apos_delete

    # ---- 15. Rascunho com rateio defasado ainda edita itens (regressao) ----
    defasado = "00000000-0000-4000-8000-000000000206"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{defasado}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    sql(
        "INSERT INTO pa_budget_allocations (order_id, cost_center_id, valor, percentual)"
        f" VALUES ('{defasado}', '{center_a}', 200, 100);"
    )
    sql(f"UPDATE sicoob_orders SET total_amount = 350 WHERE id = '{defasado}';")
    rascunho_defasado = scalar(
        f"SELECT total_amount FROM sicoob_orders WHERE id = '{defasado}';"
    )
    assert rascunho_defasado == "350.00", rascunho_defasado
    result["rascunho_defasado"] = {
        "edita_item": "permitido",
        "motivo_entrada_na_verba": must_fail(
            f"UPDATE sicoob_orders SET status = 'waiting_approval' WHERE id = '{defasado}';",
            "soma",
        ),
    }
    assert scalar(f"SELECT status FROM sicoob_orders WHERE id = '{defasado}';") == "draft"

    # ---- 16. Livro so aceita verba do proprio PA (achado Devin #10) --------
    verba_b = scalar(
        "SELECT id FROM pa_budgets WHERE pa_id = "
        f"'{PA_A}' AND ano = EXTRACT(YEAR FROM now()) AND mes = EXTRACT(MONTH FROM now());"
    ).strip()
    # Manter o PA autorizado e variar so o mes: trocar o PA ja era barrado pela
    # policy de escopo e nao provava a checagem de competencia.
    result["livro_escopo"] = {
        "pa_de_outro_gestor": must_fail(
            f"SET request.jwt.claim.sub = '{GESTOR_A}';\nSET ROLE authenticated;\n"
            "INSERT INTO pa_budget_entries (pa_budget_id, pa_id, competencia_ano,"
            " competencia_mes, tipo, estado, valor, actor_id)"
            f" VALUES ('{verba_b}', '{PA_B}', EXTRACT(YEAR FROM now())::int,"
            " EXTRACT(MONTH FROM now())::int, 'ajuste', 'consumido', 10,"
            f" '{GESTOR_A}');",
            "row-level security",
        ),
        "competencia_divergente": must_fail(
            f"SET request.jwt.claim.sub = '{GESTOR_A}';\nSET ROLE authenticated;\n"
            "INSERT INTO pa_budget_entries (pa_budget_id, pa_id, competencia_ano,"
            " competencia_mes, tipo, estado, valor, actor_id)"
            f" VALUES ('{verba_b}', '{PA_A}', EXTRACT(YEAR FROM now())::int,"
            " (EXTRACT(MONTH FROM now())::int % 12) + 1, 'ajuste', 'consumido', 10,"
            f" '{GESTOR_A}');",
            "row-level security",
        ),
        "competencia_correta": "gravado",
    }
    gravou = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\nSET ROLE authenticated;\n"
        "INSERT INTO pa_budget_entries (pa_budget_id, pa_id, competencia_ano,"
        " competencia_mes, tipo, estado, valor, actor_id)"
        f" VALUES ('{verba_b}', '{PA_A}', EXTRACT(YEAR FROM now())::int,"
        " EXTRACT(MONTH FROM now())::int, 'ajuste', 'consumido', 10,"
        f" '{GESTOR_A}');"
    )
    assert gravou.returncode == 0, gravou.stderr

    # ---- 17. Escrita do rateio exige autoridade, nao apenas leitura ---------
    somente_leitura = "00000000-0000-4000-8000-000000000207"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{somente_leitura}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 100);"
    )
    sql(
        "INSERT INTO pa_budget_allocations (order_id, cost_center_id, valor, percentual)"
        f" VALUES ('{somente_leitura}', '{center_a}', 100, 100);"
    )
    # O leitor por escopo alcanca o pedido, mas nao e autoridade de verba: a RLS
    # precisa barrar DELETE/UPDATE do rateio (antes a policy era `FOR ALL` sobre a
    # leitura do pedido).
    actor_sql(
        LEITOR,
        "SET ROLE authenticated;\n"
        f"DELETE FROM pa_budget_allocations WHERE order_id = '{somente_leitura}';",
        check=False,
    )
    restou = scalar(
        "SELECT count(*) || '|' || COALESCE(sum(valor), 0) FROM pa_budget_allocations"
        f" WHERE order_id = '{somente_leitura}';"
    )
    assert restou == "1|100.00", restou
    resultado_update = actor_sql(
        LEITOR,
        "SET ROLE authenticated;\n"
        "UPDATE pa_budget_allocations SET valor = 1"
        f" WHERE order_id = '{somente_leitura}';",
    )
    assert resultado_update.stdout.strip().endswith("UPDATE 0"), resultado_update.stdout
    # O Gestor de Compras da mesma cooperativa continua podendo refazer o rateio.
    api_gestor = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        "SET ROLE authenticated;\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{somente_leitura}', "
        f"'[{{\"cost_center_id\":\"{center_a}\",\"valor\":100,\"percentual\":100}}]'::jsonb);"
    ).stdout.strip().splitlines()[-1]
    assert api_gestor == "1", api_gestor
    result["rateio_rls"] = {
        "leitor_apaga": restou,
        "gestor_substitui": api_gestor,
    }

    # ---- 18. Gestor Singular mantem centro de custo da propria cooperativa --
    criado_singular = sql(
        f"SET request.jwt.claim.sub = '{SINGULAR}';\n"
        "SET ROLE authenticated;\n"
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_A}', 'CC-03', 'Frota');"
    )
    assert criado_singular.returncode == 0, criado_singular.stderr
    fora_do_escopo = must_fail(
        f"SET request.jwt.claim.sub = '{SINGULAR}';\n"
        "SET ROLE authenticated;\n"
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_B}', 'CC-04', 'Alheio');",
        "row-level security",
    )
    assert scalar(
        "SELECT count(*) FROM cost_centers WHERE codigo IN ('CC-03', 'CC-04');"
    ) == "1"
    result["centro_custo_singular"] = {
        "propria_cooperativa": "criado",
        "outra_cooperativa": fora_do_escopo,
    }

    # ---- 19. Rateio nao aceita centro de custo de outra cooperativa --------
    # A RPC roda como proprietaria e nao passa pela policy de INSERT: o vinculo
    # centro x cooperativa do pedido precisa ser provado dentro dela.
    center_b = scalar(
        "SELECT id FROM cost_centers"
        f" WHERE cooperativa_id = '{COOP_B}' AND codigo = 'CC-02';"
    )
    alheio = "00000000-0000-4000-8000-000000000208"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{alheio}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 100);"
    )
    centro_alheio = must_fail(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT * FROM pa_budget_replace_allocations('{alheio}', "
        f"'[{{\"cost_center_id\":\"{center_b}\",\"valor\":100,\"percentual\":100}}]'::jsonb);",
        "nao pertence a cooperativa do pedido",
    )
    assert scalar(
        f"SELECT count(*) FROM pa_budget_allocations WHERE order_id = '{alheio}';"
    ) == "0", "rateio de centro alheio nao pode gravar linha"
    result["rateio_centro_alheio"] = centro_alheio

    # ---- 20. Pedido de outro escopo responde igual a pedido inexistente ----
    # Antes a RPC separava "nao encontrado" de "sem permissao", o que confirmava
    # a existencia de um pedido privado a partir do identificador.
    inexistente = must_fail(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT * FROM pa_budget_replace_allocations('00000000-0000-4000-8000-0000000002ff', '[]'::jsonb);",
        "nao encontrado ou sem permissao",
    )
    fora_escopo = must_fail(
        f"SET request.jwt.claim.sub = '{GESTOR_B}';\n"
        f"SELECT * FROM pa_budget_replace_allocations('{alheio}', '[]'::jsonb);",
        "nao encontrado ou sem permissao",
    )
    assert "nao encontrado," not in inexistente, inexistente
    assert "nao encontrado," not in fora_escopo, fora_escopo
    result["rateio_oraculo"] = {
        "inexistente": inexistente,
        "fora_do_escopo": fora_escopo,
    }

    # ---- 21. O livro divide o pedido pelos centros do rateio ---------------
    # Sem isso o rateio viveria so na tela: o livro debitaria o pedido inteiro
    # em um unico centro e o custo por unidade ficaria errado.
    dividido = "00000000-0000-4000-8000-000000000209"
    sql(
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_A}', 'CC-05', 'Frota');"
    )
    center_c = scalar(
        "SELECT id FROM cost_centers"
        f" WHERE cooperativa_id = '{COOP_A}' AND codigo = 'CC-05';"
    )
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{dividido}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    rateio = json.dumps([
        {"cost_center_id": center_a, "valor": 120, "percentual": 60},
        {"cost_center_id": center_c, "valor": 80, "percentual": 40},
    ])
    sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{dividido}', '{rateio}'::jsonb);"
    )
    reservado_antes = Decimal(estados()["reservado"])
    move(dividido, "waiting_approval")
    por_centro = scalar(
        "SELECT string_agg(codigo || '=' || valor, ',' ORDER BY codigo)"
        "  FROM ("
        "    SELECT COALESCE(c.codigo, 'sem-centro') AS codigo, sum(e.valor) AS valor"
        "      FROM pa_budget_entries e"
        "      LEFT JOIN cost_centers c ON c.id = e.cost_center_id"
        f"     WHERE e.order_id = '{dividido}' AND e.estado = 'reservado'"
        "     GROUP BY 1"
        "  ) AS posicao;"
    )
    assert por_centro == "CC-01=120.00,CC-05=80.00", por_centro
    # O total sobe exatamente o valor do pedido, nem mais nem menos.
    esperado = reservado_antes + Decimal("200.00")
    assert Decimal(estados()["reservado"]) == esperado, estados()
    # Confirmar move os dois centros juntos, sem deixar residuo no anterior.
    move(dividido, "confirmed")
    comprometido = scalar(
        "SELECT string_agg(codigo || '=' || valor, ',' ORDER BY codigo)"
        "  FROM ("
        "    SELECT COALESCE(c.codigo, 'sem-centro') AS codigo, sum(e.valor) AS valor"
        "      FROM pa_budget_entries e"
        "      LEFT JOIN cost_centers c ON c.id = e.cost_center_id"
        f"     WHERE e.order_id = '{dividido}' AND e.estado = 'comprometido'"
        "     GROUP BY 1"
        "  ) AS posicao;"
    )
    assert comprometido == "CC-01=120.00,CC-05=80.00", comprometido
    zerado = scalar(
        "SELECT COALESCE(sum(valor), 0) FROM pa_budget_entries"
        f" WHERE order_id = '{dividido}' AND estado = 'reservado';"
    )
    assert zerado == "0.00", zerado
    result["livro_por_centro"] = {
        "reservado_por_centro": por_centro,
        "reservado_apos_comprometer": zerado,
        "comprometido_por_centro": comprometido,
    }

    # ---- 22. Cota que arredonda para 0,00 nao trava o rateio ---------------
    # Pedido de 1,00 dividido em tres centros: 0,01 + 0,01 + 0,98. Uma cota
    # cheia de centavo nenhum (0,00) pode aparecer quando a ultima linha
    # absorve o resto; a constraint antiga (percentual > 0) recusava e o
    # rateio ficava irrecuperavel pela tela.
    centavos = "00000000-0000-4000-8000-000000000210"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{centavos}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 0.01);"
    )
    centro_zero = json.dumps([{"cost_center_id": center_a, "valor": 0.01, "percentual": 100}])
    sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{centavos}', '{centro_zero}'::jsonb);"
    )
    percentual_zero = scalar(
        "SELECT COALESCE(percentual, 0) FROM pa_budget_allocations"
        f" WHERE order_id = '{centavos}';"
    )
    sql(f"DELETE FROM pa_budget_allocations WHERE order_id = '{centavos}';")
    sql(
        "INSERT INTO pa_budget_allocations (order_id, cost_center_id, valor, percentual)"
        f" VALUES ('{centavos}', '{center_a}', 0.01, 0);"
    )
    cota_zerada = scalar(
        "SELECT COALESCE(percentual, 0) FROM pa_budget_allocations"
        f" WHERE order_id = '{centavos}';"
    )
    assert cota_zerada == "0.00", cota_zerada
    sql(f"DELETE FROM pa_budget_allocations WHERE order_id = '{centavos}';")
    result["cota_arredondada"] = {
        "percentual_100": percentual_zero,
        "percentual_0_aceito": cota_zerada,
    }

    # ---- 23. Rateio defasado em pedido ja comprometido ----------------------
    # Trocar o rateio tem que reemitir a posicao no livro; sem isso o pedido
    # continuaria debitando os centros antigos.
    def centro_do_pedido(order_id):
        return scalar(
            "SELECT string_agg(codigo || '=' || valor, ',' ORDER BY codigo)"
            "  FROM ("
            "    SELECT COALESCE(c.codigo, 'sem-centro') AS codigo, sum(e.valor) AS valor"
            "      FROM pa_budget_entries e"
            "      LEFT JOIN cost_centers c ON c.id = e.cost_center_id"
            f"     WHERE e.order_id = '{order_id}' AND e.estado = 'comprometido'"
            "     GROUP BY 1"
            "  ) AS posicao;"
        )

    reemitido = "00000000-0000-4000-8000-000000000211"
    sql(
        "INSERT INTO cost_centers (cooperativa_id, codigo, nome)"
        f" VALUES ('{COOP_A}', 'CC-06', 'Marketing');"
    )
    center_d = scalar(
        "SELECT id FROM cost_centers"
        f" WHERE cooperativa_id = '{COOP_A}' AND codigo = 'CC-06';"
    )
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{reemitido}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    rateio_a = json.dumps([{"cost_center_id": center_a, "valor": 200, "percentual": 100}])
    sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{reemitido}', '{rateio_a}'::jsonb);"
    )
    move(reemitido, "confirmed")
    assert centro_do_pedido(reemitido) == "CC-01=200.00", centro_do_pedido(reemitido)

    rateio_b = json.dumps([
        {"cost_center_id": center_a, "valor": 50, "percentual": 25},
        {"cost_center_id": center_d, "valor": 150, "percentual": 75},
    ])
    sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{reemitido}', '{rateio_b}'::jsonb);"
    )
    reemitido_centros = centro_do_pedido(reemitido)
    assert reemitido_centros == "CC-01=50.00,CC-06=150.00", reemitido_centros
    total_reemitido = scalar(
        "SELECT COALESCE(sum(valor), 0) FROM pa_budget_entries"
        f" WHERE order_id = '{reemitido}' AND estado = 'comprometido';"
    )
    assert total_reemitido == "200.00", total_reemitido
    result["rateio_reemitido"] = {
        "antes": "CC-01=200.00",
        "depois": reemitido_centros,
        "total": total_reemitido,
    }

    # ---- 24. Soma fora do centavo e recusada no caminho estrito -------------
    # 199,99 para um pedido de 200,00 passava pela tolerancia de R$ 0,01 e a
    # verba consumida divergia do pedido. No caminho estrito tem que falhar.
    estrito = "00000000-0000-4000-8000-000000000212"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{estrito}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    rateio_curto = json.dumps([{"cost_center_id": center_a, "valor": 199.99, "percentual": 100}])
    # Em rascunho a soma parcial e aceita (o rateio e montado linha a linha).
    sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{estrito}', "
        f"'{rateio_curto}'::jsonb);"
    )
    result["rateio_estrito"] = must_fail(
        f"UPDATE sicoob_orders SET status = 'waiting_approval' WHERE id = '{estrito}';",
        "soma 199.99",
    )
    assert scalar(f"SELECT status FROM sicoob_orders WHERE id = '{estrito}';") == "draft"

    # ---- 25. Pedido legado consumido nao debita duas vezes ------------------
    # O pedido 102 nasceu `delivered` antes do livro existir: os 60 dele estao
    # no agregado e o backfill os atribuiu ao proprio pedido. A transicao para
    # `completed` precisa encontrar essa posicao, nao lancar consumo de novo.
    legado = "00000000-0000-4000-8000-000000000102"
    consumido_legado = scalar(
        "SELECT verba_consumida FROM pa_budgets"
        f" WHERE pa_id = '{PA_A}' AND ano = EXTRACT(YEAR FROM now())"
        " AND mes = EXTRACT(MONTH FROM now());"
    )
    move(legado, "completed")
    consumido_apos = scalar(
        "SELECT verba_consumida FROM pa_budgets"
        f" WHERE pa_id = '{PA_A}' AND ano = EXTRACT(YEAR FROM now())"
        " AND mes = EXTRACT(MONTH FROM now());"
    )
    assert consumido_apos == consumido_legado, (consumido_legado, consumido_apos)
    eventos_legado = scalar(
        "SELECT count(*) || '|' || COALESCE(sum(valor), 0) FROM pa_budget_entries"
        f" WHERE order_id = '{legado}';"
    )
    assert eventos_legado == "1|60.00", eventos_legado
    result["legado_sem_debito_duplo"] = {
        "agregado_antes": consumido_legado,
        "agregado_depois": consumido_apos,
        "eventos_do_pedido": eventos_legado,
    }

    # ---- 26. Concorrencia: dois salvamentos nao somam 200% ------------------
    # O segundo salvamento espera o FOR UPDATE, entao o DELETE dele enxerga as
    # linhas do primeiro e o rateio final e o ultimo enviado, nao a soma.
    concorrente = "00000000-0000-4000-8000-000000000214"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{concorrente}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 200);"
    )
    rateio_1 = json.dumps([{"cost_center_id": center_a, "valor": 200, "percentual": 100}])
    rateio_2 = json.dumps([{"cost_center_id": center_d, "valor": 200, "percentual": 100}])
    primeira = subprocess.Popen(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
         "-v", "ON_ERROR_STOP=1", "-At"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    primeira.stdin.write(
        "BEGIN;\n"
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{concorrente}', "
        f"'{rateio_1}'::jsonb);\n"
        "SELECT pg_sleep(2);\n"
        "COMMIT;\n"
    )
    primeira.stdin.flush()
    time.sleep(0.5)
    segunda = sql(
        f"SET request.jwt.claim.sub = '{GESTOR_A}';\n"
        f"SELECT count(*) FROM pa_budget_replace_allocations('{concorrente}', "
        f"'{rateio_2}'::jsonb);"
    )
    primeira.communicate(timeout=30)
    assert primeira.returncode == 0, primeira.stderr.read() if primeira.stderr else "falha"
    assert segunda.returncode == 0, segunda.stderr
    # Os dois rateios valem 200 num unico centro, entao o valor nao diz quem
    # venceu: a prova e o centro gravado, que so pode ser o do ultimo envio.
    linhas_concorrente = scalar(
        "SELECT count(*) || '|' || COALESCE(sum(a.valor), 0) || '|' ||"
        " COALESCE(string_agg(c.codigo, ',' ORDER BY c.codigo), 'sem-centro')"
        "  FROM pa_budget_allocations a"
        "  JOIN cost_centers c ON c.id = a.cost_center_id"
        f" WHERE a.order_id = '{concorrente}';"
    )
    codigo_vencedor = scalar(f"SELECT codigo FROM cost_centers WHERE id = '{center_d}';")
    assert linhas_concorrente == f"1|200.00|{codigo_vencedor}", linhas_concorrente
    result["rateio_concorrente"] = {
        "linhas": linhas_concorrente,
        "centro_do_primeiro_envio": scalar(
            f"SELECT codigo FROM cost_centers WHERE id = '{center_a}';"
        ),
        "centro_do_ultimo_envio": codigo_vencedor,
    }

    # ---- 27. Cota arredondada para 0% no caminho real de reserva -----------
    # Duas cotas de 33,33% fecham 100% sem sobra, mas o rateio pode chegar com
    # a ultima cota em 0% (arredondamento do editor). A reserva tem que lancar
    # os dois centros (um deles com zero) e nao rejeitar o rateio inteiro.
    cota = "00000000-0000-4000-8000-000000000215"
    sql(
        "INSERT INTO sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)"
        f" VALUES ('{cota}', '{PA_A}', '{COOP_A}', '{GESTOR_A}', 'draft', 100);"
    )
    rateio_cota = json.dumps([
        {"cost_center_id": center_a, "valor": 100, "percentual": 100},
        {"cost_center_id": center_d, "valor": 0, "percentual": 0},
    ])
    # A RPC precisa ter gravado as DUAS cotas: provar so o lancamento do centro
    # de 100% passaria mesmo se a cota de 0% tivesse sido descartada no salvamento.
    cotas_gravadas = actor_sql(
        GESTOR_A,
        f"SELECT count(*) || '|' || COALESCE(string_agg("
        "  c.codigo || '=' || a.percentual::text || '%/' || a.valor, ','"
        "  ORDER BY c.codigo), 'vazio')"
        "  FROM pa_budget_replace_allocations("
        f"'{cota}', '{rateio_cota}'::jsonb) a"
        "  JOIN cost_centers c ON c.id = a.cost_center_id;"
    ).stdout.strip().splitlines()[-1]
    assert cotas_gravadas == "2|CC-01=100.00%/100.00,CC-06=0.00%/0.00", cotas_gravadas
    move(cota, "waiting_approval")
    lancamentos_cota = scalar(
        "SELECT string_agg(codigo || '=' || valor, ',' ORDER BY codigo)"
        "  FROM ("
        "    SELECT COALESCE(c.codigo, 'sem-centro') AS codigo, sum(e.valor) AS valor"
        "      FROM pa_budget_entries e"
        "      LEFT JOIN cost_centers c ON c.id = e.cost_center_id"
        f"     WHERE e.order_id = '{cota}' AND e.estado = 'reservado'"
        "     GROUP BY 1"
        "  ) AS posicao;"
    )
    assert lancamentos_cota == "CC-01=100.00", lancamentos_cota
    centro_zero_lancado = scalar(
        "SELECT count(*) FROM pa_budget_entries e"
        "  JOIN cost_centers c ON c.id = e.cost_center_id"
        f" WHERE e.order_id = '{cota}' AND c.codigo = 'CC-06';"
    )
    assert centro_zero_lancado == "0", centro_zero_lancado
    result["cota_zero_reserva"] = {
        "rateio_aceito": "100%+0%",
        "cotas_gravadas": cotas_gravadas,
        "lancamentos": lancamentos_cota,
        "centro_zero_sem_lancamento": centro_zero_lancado,
    }

    # ---- 28. Cap do backfill e reaplicacao idempotente ---------------------
    # O gatilho antigo debitava pela data de confirmacao e o backfill atribui
    # pela data de criacao: a soma dos pedidos entregues pode superar o consumo
    # registrado. Nenhum pedido pode lancar mais do que ainda sobra, e reaplicar
    # o backfill sobre um livro preservado nao pode duplicar linhas.
    pa_c = "00000000-0000-4000-8000-000000000003"
    do_pa_c = (
        "SELECT count(*) || '|' || COALESCE(sum(e.valor), 0) || '|' ||"
        " COALESCE(string_agg(e.order_id::text || '=' || e.valor, ','"
        " ORDER BY e.order_id), 'sem-pedido')"
        "  FROM pa_budget_entries e"
        "  JOIN pa_budgets b ON b.id = e.pa_budget_id"
        f" WHERE b.pa_id = '{pa_c}'"
    )
    agregado_pa_c = (
        "SELECT verba_consumida FROM pa_budgets"
        f" WHERE pa_id = '{pa_c}' AND ano = EXTRACT(YEAR FROM now())"
        " AND mes = EXTRACT(MONTH FROM now());"
    )
    # Pedidos entregues somam 160 contra 100 de consumo registrado.
    primeira_passada = scalar(do_pa_c)
    assert primeira_passada == (
        "2|100.00|00000000-0000-4000-8000-000000000281=80.00,"
        "00000000-0000-4000-8000-000000000282=20.00"
    ), primeira_passada
    assert scalar(agregado_pa_c) == "100.00", scalar(agregado_pa_c)

    sql(carregar_backfill())
    segunda_passada = scalar(do_pa_c)
    assert segunda_passada == primeira_passada, segunda_passada
    assert scalar(agregado_pa_c) == "100.00", "reaplicacao nao pode inflar o agregado"
    result["backfill_cap_idempotencia"] = {
        "pedidos_entregues": "80.00+80.00",
        "consumo_registrado": "100.00",
        "lancado_na_primeira": primeira_passada,
        "lancado_na_reaplicacao": segunda_passada,
        "agregado_apos_reaplicar": scalar(agregado_pa_c),
    }

    # ---- 29. Concluir pedido legado nao consome de novo -------------------
    # O backfill limitou o lancamento ao consumo registrado: o pedido 282 vale
    # 80 no pedido e apenas 20 no livro. `delivered` -> `completed` nao e gasto
    # novo; antes o estorno da posicao parcial e o relancamento do total
    # elevavam o consumo a 160 e o pedido ainda passava no saldo.
    consumido_pa_c = (
        "SELECT verba_consumida FROM pa_budgets"
        f" WHERE pa_id = '{pa_c}' AND ano = EXTRACT(YEAR FROM now())"
        " AND mes = EXTRACT(MONTH FROM now());"
    )
    move("00000000-0000-4000-8000-000000000282", "completed")
    apos_concluir = scalar(agregado_pa_c)
    move("00000000-0000-4000-8000-000000000281", "completed")
    apos_concluir_dois = scalar(agregado_pa_c)
    # 283 ficou sem lancamento: o cap do backfill esgotou os 100 registrados
    # antes dele. Concluir nao pode exigir saldo (PA C so tem 900 planejados
    # e 100 consumidos) nem criar posicao nova no livro.
    move("00000000-0000-4000-8000-000000000283", "completed")
    apos_concluir_tres = scalar(agregado_pa_c)
    assert apos_concluir == "100.00", apos_concluir
    assert apos_concluir_dois == "100.00", apos_concluir_dois
    assert apos_concluir_tres == "100.00", apos_concluir_tres
    assert scalar(do_pa_c) == primeira_passada, scalar(do_pa_c)
    zero_livro = scalar(
        "SELECT count(*) FROM pa_budget_entries"
        " WHERE order_id = '00000000-0000-4000-8000-000000000283';"
    )
    assert zero_livro == "0", zero_livro
    result["conclusao_legado_sem_consumo"] = {
        "pedido_concluido": "valor 80, livro 20",
        "consumo_apos_concluir": apos_concluir,
        "consumo_apos_concluir_dois": apos_concluir_dois,
        "pedido_capado_a_zero_concluido": "00000000-0000-4000-8000-000000000283",
        "consumo_apos_concluir_capado": apos_concluir_tres,
        "lancamentos_preservados": scalar(do_pa_c),
        "consumido_no_agregado": scalar(consumido_pa_c),
    }

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/verba-lifecycle.json"
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
