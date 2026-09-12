"""Reproduz lacunas da revisão; sucesso do script NÃO significa produto aprovado.

Usa somente fixture sintética e quatro migrations, em PostgreSQL sem rede.
Escritas diretas usam postgres: verificam invariantes, não explorabilidade via RLS.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
DESTINO = ROOT / "docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json"
CONTAINER = "sicoob-revisao-" + uuid.uuid4().hex[:12]
FONTES = [
    "tests/scenarios/sql/sicoob-approval-policy-fixture.sql",
    "supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql",
    "supabase/migrations/20260912110000_sicoob_order_status_events.sql",
    "supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql",
    "supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql",
]
AUTOR = "11111111-1111-1111-1111-111111111111"
GESTOR = "22222222-2222-2222-2222-222222222222"
COOP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def comando(args, entrada=None, conferir=True):
    return subprocess.run(args, input=entrada, text=True, capture_output=True, check=conferir)


def sql(texto):
    resposta = comando([
        "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
        "-v", "ON_ERROR_STOP=1", "-At",
    ], entrada=texto)
    linhas = [linha for linha in resposta.stdout.splitlines() if linha and linha != "SET"]
    return linhas[-1] if linhas else ""


def consulta(texto):
    # Comandos INSERT também emitem a contagem; encapsular em CTE retorna só o dado.
    return sql(texto)


def novo_pedido(valor=100, status="pending"):
    return consulta(f"""WITH novo AS (
      INSERT INTO sicoob_orders(pa_id,cooperative_id,created_by,status,total_amount)
      VALUES ('{PA}','{COOP}','{AUTOR}','{status}',{valor}) RETURNING id
    ) SELECT id FROM novo;""")


def preparar(order_id):
    sql(f"SET request.jwt.claim.sub = '{AUTOR}'; SELECT prepare_sicoob_order_confirmation('{order_id}','pending','Revisão sintética');")


casos = []


def registrar(codigo, observado, esperado_na_reproducao, criterio):
    assert observado == esperado_na_reproducao, (codigo, observado, esperado_na_reproducao)
    casos.append({"id": codigo, "falha_reproduzida": True, "observado": observado, "criterio_nao_atendido": criterio})


try:
    comando(["docker", "run", "--rm", "-d", "--name", CONTAINER,
             "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine"])
    for _ in range(120):
        if comando(["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"], conferir=False).returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError("PostgreSQL descartável não iniciou")
    for fonte in FONTES:
        sql((ROOT / fonte).read_text())
    sql(f"""
      INSERT INTO cooperativas(id,name) VALUES ('{COOP}','Cooperativa sintética');
      INSERT INTO pa_budgets(pa_id,ano,mes,verba_total,limite_alcada)
      VALUES ('{PA}',EXTRACT(YEAR FROM now()),EXTRACT(MONTH FROM now()),10000,500);
      INSERT INTO profiles(user_id,cooperativa_id,pa_id,is_active) VALUES
      ('{AUTOR}','{COOP}','{PA}',true),('{GESTOR}','{COOP}','{PA}',true);
      INSERT INTO user_roles(user_id,role) VALUES ('{AUTOR}','gerente_pa'),('{GESTOR}','gerente_pa');
    """)

    baseline = novo_pedido()
    preparar(baseline)
    sql(f"""INSERT INTO sicoob_approval_policies(cooperative_id,version,effective_from)
      VALUES ('{COOP}','local-v1',now()-interval '2 days');""")
    registrar("S01", consulta(f"""SELECT o.approval_policy_version || '|' || p.policy_version
      FROM sicoob_orders o CROSS JOIN LATERAL get_sicoob_order_approval_policy(o.id) p
      WHERE o.id='{baseline}';"""), "baseline-tecnica-v1|local-v1",
      "Publicar política posterior não deve mudar a regra de um pedido já preparado na base técnica.")

    vinculado = novo_pedido()
    preparar(vinculado)
    antes = consulta(f"SELECT sicoob_actor_can_approve('{AUTOR}','{vinculado}')::text;")
    sql("UPDATE sicoob_approval_policies SET forbid_self_approval=false,version='local-v2' WHERE version='local-v1';")
    depois = consulta(f"""SELECT o.approval_policy_version || '|' || p.policy_version || '|'
      || sicoob_actor_can_approve('{AUTOR}',o.id)::text
      FROM sicoob_orders o CROSS JOIN LATERAL get_sicoob_order_approval_policy(o.id) p WHERE o.id='{vinculado}';""")
    registrar("S02", antes + "|" + depois, "false|local-v1|local-v2|true",
      "A versão vinculada deve preservar conteúdo e impedimentos, inclusive após edição administrativa da política.")

    sem_snapshot = novo_pedido()
    sql("""INSERT INTO sicoob_approval_policies(cooperative_id,version,effective_from)
      VALUES (NULL,'global-v1',now()-interval '1 day');""")
    registrar("S03", consulta(f"SELECT policy_version FROM get_sicoob_order_approval_policy('{sem_snapshot}');"""),
      "global-v1", "Política específica vigente deve ter precedência sobre fallback global; a precedência precisa de aceite de negócio.")

    sql(f"""UPDATE sicoob_orders SET approval_policy_id=(SELECT id FROM sicoob_approval_policies WHERE version='global-v1'),
      approval_policy_version='global-v1' WHERE id='{vinculado}';""")
    registrar("S04", consulta(f"SELECT status || '|' || approval_policy_version FROM sicoob_orders WHERE id='{vinculado}';"),
      "waiting_approval|global-v1", "Referências da política devem permanecer congeladas durante análise, mesmo para escritores privilegiados.")

    confirmado = novo_pedido()
    sql(f"INSERT INTO sicoob_order_items(order_id,quantity,unit_price,total_price) VALUES ('{confirmado}',1,100,100);")
    sql(f"SET request.jwt.claim.sub='{GESTOR}'; SELECT confirm_sicoob_order('{confirmado}','pending');")
    sql(f"UPDATE sicoob_order_items SET quantity=2,total_price=200 WHERE order_id='{confirmado}';")
    registrar("S05", consulta(f"""SELECT o.status || '|' || o.total_amount || '|' || sum(i.total_price)
      FROM sicoob_orders o JOIN sicoob_order_items i ON i.order_id=o.id WHERE o.id='{confirmado}' GROUP BY o.id;"""),
      "confirmed|100.00|200.00", "Itens aprovados não devem mudar sem revisão da despesa, com consistência entre itens e total.")

    pendente = novo_pedido()
    rascunho = novo_pedido(status="draft")
    sql(f"INSERT INTO sicoob_order_items(order_id,quantity,unit_price,total_price) VALUES ('{pendente}',1,100,100);")
    preparar(pendente)
    sql(f"UPDATE sicoob_order_items SET order_id='{rascunho}' WHERE order_id='{pendente}';")
    registrar("S06", consulta(f"""SELECT status || '|' || (SELECT count(*) FROM sicoob_order_items WHERE order_id='{pendente}')
      || '|' || (SELECT count(*) FROM sicoob_order_items WHERE order_id='{rascunho}') FROM sicoob_orders WHERE id='{pendente}';"""),
      "waiting_approval|0|1", "Reatribuição de item deve validar ambos os pedidos, inclusive o pedido anterior sob análise.")

    resultado = {
        "coletado_em": datetime.now(timezone.utc).isoformat(),
        "commit_codigo": comando(["git", "-C", str(ROOT), "rev-parse", "HEAD"]).stdout.strip(),
        "ambiente": "PostgreSQL 16 descartável; --network none; dados sintéticos",
        "limites": "Fixture mínima e quatro migrations; escritas diretas como postgres. Não testa RLS integral, API, schema remoto ou explorabilidade por comprador.",
        "producao_verificada": False,
        "resultado": "Seis lacunas reproduzidas; produto não aprovado por este ensaio",
        "fontes": [{"arquivo": f, "sha256": hashlib.sha256((ROOT / f).read_bytes()).hexdigest()} for f in FONTES],
        "casos": casos,
    }
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(resultado, ensure_ascii=False))
finally:
    comando(["docker", "rm", "-f", CONTAINER], conferir=False)
