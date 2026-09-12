"""Valida consolidação, destinos e recebimentos parciais sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-consolidation-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-consolidation-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260912190000_sicoob_consolidation_distribution.sql"
MANAGER = "11111111-1111-1111-1111-111111111111"
SELLER = "22222222-2222-2222-2222-222222222222"
PA_RECEIVER = "33333333-3333-3333-3333-333333333333"
OUTSIDER = "44444444-4444-4444-4444-444444444444"
COOP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OTHER_COOP = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
PA1 = "c1111111-1111-1111-1111-111111111111"
PA2 = "c2222222-2222-2222-2222-222222222222"
ORDER1 = "d1111111-1111-1111-1111-111111111111"
ORDER2 = "d2222222-2222-2222-2222-222222222222"
BAD_ORDER = "d3333333-3333-3333-3333-333333333333"
ITEM1 = "e1111111-1111-1111-1111-111111111111"
ITEM2 = "e2222222-2222-2222-2222-222222222222"
KEY = "f1111111-1111-1111-1111-111111111111"


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


def actor_sql(actor, statement, *, check=True):
    return sql(f"SET request.jwt.claim.sub = '{actor}';\n{statement}", check=check)


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line != "SET"]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


result = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine",
    ])
    for _ in range(120):
        if command(["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"], check=False).returncode == 0:
            break
        time.sleep(0.25)

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(f"""
      INSERT INTO auth.users VALUES ('{MANAGER}'), ('{SELLER}'), ('{PA_RECEIVER}'), ('{OUTSIDER}');
      INSERT INTO public.user_roles VALUES
        ('{MANAGER}', 'gestor_compras'), ('{SELLER}', 'vendedor'),
        ('{PA_RECEIVER}', 'gerente_pa'), ('{OUTSIDER}', 'gerente_pa');
      INSERT INTO public.profiles VALUES
        ('{MANAGER}', '{MANAGER}', true, NULL, '{COOP}', NULL),
        ('{SELLER}', '{SELLER}', true, NULL, '{COOP}', NULL),
        ('{PA_RECEIVER}', '{PA_RECEIVER}', true, NULL, '{COOP}', '{PA1}'),
        ('{OUTSIDER}', '{OUTSIDER}', true, NULL, '{OTHER_COOP}', NULL);
      INSERT INTO public.postos_atendimento VALUES
        ('{PA1}', '{COOP}', 'PA Centro', '001', 'Rua Um', 'Goiânia', 'GO'),
        ('{PA2}', '{COOP}', 'PA Norte', '002', 'Rua Dois', 'Goiânia', 'GO');
      INSERT INTO public.sicoob_orders (id, cooperative_id, pa_id, total_amount, status) VALUES
        ('{ORDER1}', '{COOP}', '{PA1}', 100, 'confirmed'),
        ('{ORDER2}', '{COOP}', '{PA2}', 50, 'confirmed'),
        ('{BAD_ORDER}', '{OTHER_COOP}', '{PA2}', 10, 'draft');
      INSERT INTO public.sicoob_order_items VALUES
        ('{ITEM1}', '{ORDER1}', 'Caneca', 10),
        ('{ITEM2}', '{ORDER2}', 'Caderno', 5);
    """)

    consolidation = scalar(actor_sql(MANAGER, f"""
      SELECT public.create_sicoob_order_consolidation(
        ARRAY['{ORDER1}'::uuid, '{ORDER2}'::uuid], '{SELLER}', '{KEY}'
      );
    """))
    repeated = scalar(actor_sql(MANAGER, f"""
      SELECT public.create_sicoob_order_consolidation(
        ARRAY['{ORDER1}'::uuid, '{ORDER2}'::uuid], '{SELLER}', '{KEY}'
      );
    """))
    assert consolidation == repeated
    linked = scalar(sql(f"""
      SELECT order_count || '|' || total_value || '|' ||
             (SELECT count(*) FROM public.order_consolidation_orders WHERE consolidation_id='{consolidation}')
      FROM public.order_consolidations WHERE id='{consolidation}';
    """))
    assert linked == "2|150.00|2", linked
    failed_create = actor_sql(MANAGER, f"""
      SELECT public.create_sicoob_order_consolidation(
        ARRAY['{BAD_ORDER}'::uuid], '{SELLER}', 'f2222222-2222-2222-2222-222222222222'
      );
    """, check=False)
    assert failed_create.returncode != 0 and "confirmados" in failed_create.stderr
    assert scalar(sql("SELECT count(*) FROM public.order_consolidations;")) == "1"
    result["criacao"] = "dois pedidos vinculados atomicamente; repetição idempotente; lote inválido sem órfãos"

    allocated = scalar(actor_sql(MANAGER, f"SELECT public.allocate_sicoob_consolidation_by_order_pa('{consolidation}');"))
    assert allocated == "2", allocated
    destinations = scalar(sql(f"""
      SELECT count(*) || '|' || sum(a.quantity)
      FROM public.sicoob_delivery_destinations d
      JOIN public.sicoob_delivery_allocations a ON a.destination_id=d.id
      WHERE d.consolidation_id='{consolidation}';
    """))
    assert destinations == "2|15", destinations
    actor_sql(MANAGER, f"SELECT public.dispatch_sicoob_order_consolidation('{consolidation}');")
    direct_change = sql(f"UPDATE public.order_consolidations SET total_value=1 WHERE id='{consolidation}';", check=False)
    assert direct_change.returncode != 0 and "fluxo transacional" in direct_change.stderr
    result["distribuicao"] = "itens distribuídos integralmente por PA; despacho exige alocação; escrita direta bloqueada"

    allocation1 = scalar(sql(f"""
      SELECT a.id FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id=a.destination_id
      WHERE d.pa_id='{PA1}';
    """))
    allocation2 = scalar(sql(f"""
      SELECT a.id FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id=a.destination_id
      WHERE d.pa_id='{PA2}';
    """))
    actor_sql(PA_RECEIVER, f"SELECT public.record_sicoob_delivery_receipt('{allocation1}', 4, 0, 0, NULL);")
    assert scalar(sql(f"SELECT status FROM public.order_consolidations WHERE id='{consolidation}';")) == "partially_received"
    over = actor_sql(PA_RECEIVER, f"SELECT public.record_sicoob_delivery_receipt('{allocation1}', 7, 0, 0, NULL);", check=False)
    assert over.returncode != 0 and "supera" in over.stderr
    actor_sql(PA_RECEIVER, f"SELECT public.record_sicoob_delivery_receipt('{allocation1}', 6, 0, 0, NULL);")
    outside = actor_sql(OUTSIDER, f"SELECT public.record_sicoob_delivery_receipt('{allocation2}', 5, 0, 0, NULL);", check=False)
    assert outside.returncode != 0 and "fora do escopo" in outside.stderr
    event_id = scalar(actor_sql(MANAGER, f"""
      SELECT public.record_sicoob_delivery_receipt(
        '{allocation2}', 3, 2, 0, 'Duas unidades chegaram avariadas'
      );
    """))
    assert scalar(sql(f"SELECT status FROM public.order_consolidations WHERE id='{consolidation}';")) == "received_with_issues"
    immutable = sql(f"UPDATE public.sicoob_delivery_receipt_events SET notes='alterado indevidamente' WHERE id='{event_id}';", check=False)
    assert immutable.returncode != 0 and "imutáveis" in immutable.stderr
    result["recebimento"] = "parciais acumulados por destino; excesso e ator externo recusados; avaria preservada em evento imutável"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/consolidacao-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
