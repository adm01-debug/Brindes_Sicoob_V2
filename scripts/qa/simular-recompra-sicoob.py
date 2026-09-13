"""Valida atomicidade, idempotência e escopo da recompra em PostgreSQL isolado."""
from pathlib import Path
import json
import subprocess
import time
import uuid
import hashlib
from postgres_ready import wait_for_postgres

CONTAINER = "sicoob-recompra-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-reorder-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260912170000_sicoob_reorder_atomic.sql"

CREATOR = "11111111-1111-1111-1111-111111111111"
UNAUTHORIZED = "22222222-2222-2222-2222-222222222222"
COOPERATIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ORG = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ORDER = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ITEM = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
PRODUCT = "ffffffff-ffff-ffff-ffff-ffffffffffff"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=statement, check=False,
        )
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
        raise RuntimeError("A consulta não retornou o valor esperado")
    return values[-1]


def payload(*, name="Caneca vigente", price=25, checked="now()"):
    checked_value = scalar(sql(f"SELECT ({checked})::timestamptz;"))
    return json.dumps([{
        "source_order_item_id": ITEM,
        "product_id": PRODUCT,
        "product_name": name,
        "product_sku": "CAN-ATUAL",
        "quantity": 2,
        "unit_price": price,
        "minimum_quantity": 1,
        "source_variant_id": None,
        "catalog_checked_at": checked_value,
        "personalizations": [{
            "line_id": ITEM,
            "technique_id": "laser-atual",
            "technique_name": "Gravação a laser vigente",
            "colors_count": 1,
            "width_cm": 4,
            "height_cm": 3,
            "personalized_quantity": 2,
            "unit_cost": 9,
            "setup_cost": 10,
            "total_cost": 18,
            "position": "Frente",
            "catalog_checked_at": checked_value,
        }],
    }])


def request_hash(suffix=ORDER):
    return hashlib.sha256(json.dumps({"source_order_id": suffix}, separators=(",", ":")).encode()).hexdigest()


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
    wait_for_postgres(command, CONTAINER)

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(f"""
      INSERT INTO public.cooperativas VALUES ('{COOPERATIVE}', 'Cooperativa sintética');
      INSERT INTO public.postos_atendimento VALUES ('{PA}', '{COOPERATIVE}', 'PA sintético');
      INSERT INTO public.organizations VALUES ('{ORG}');
      INSERT INTO public.profiles (user_id, cooperativa_id, pa_id, organization_id) VALUES
        ('{CREATOR}', '{COOPERATIVE}', '{PA}', '{ORG}'),
        ('{UNAUTHORIZED}', NULL, NULL, '{ORG}');
      INSERT INTO public.sicoob_orders VALUES
        ('{ORDER}', '{PA}', '{COOPERATIVE}', '{CREATOR}', 'completed', 20, now(), now());
      INSERT INTO public.sicoob_order_items
        (id, order_id, product_id, product_name, quantity, unit_price, total_price, personalization_snapshot)
      VALUES (
        '{ITEM}', '{ORDER}', '{PRODUCT}', 'Caneca histórica', 2, 10, 20,
        '{{"technique_id":"laser-antigo","colors_count":1,"width_cm":4,"height_cm":3}}'::jsonb
      );
    """)

    rpc_privileges = scalar(sql("""
      SELECT has_function_privilege('authenticated', 'public.reorder_sicoob_order_as_quote(uuid,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('anon', 'public.reorder_sicoob_order_as_quote(uuid,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('service_role', 'public.reorder_sicoob_order_as_quote(uuid,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('authenticated', 'public.get_sicoob_reorder_idempotency(uuid,uuid,text,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('service_role', 'public.get_sicoob_reorder_idempotency(uuid,uuid,text,text)', 'EXECUTE')::text;
    """))
    assert rpc_privileges == "false|false|true|false|true", rpc_privileges

    first_payload = payload()
    quote_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${first_payload}$payload$::jsonb, 'recompra-teste-0001', '{CREATOR}', '{request_hash()}'
      );
    """))
    retried_payload = payload(name="Caneca atualizada", price=26, checked="now() + interval '1 second'")
    same_quote_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${retried_payload}$payload$::jsonb, 'recompra-teste-0001', '{CREATOR}', '{request_hash()}'
      );
    """))
    assert same_quote_id == quote_id

    persisted = scalar(sql(f"""
      SELECT q.client_id IS NULL || '|' || q.pa_id::text || '|' || q.singular_id::text
        || '|' || q.organization_id::text || '|' || q.total::text
        || '|' || count(DISTINCT qi.id)::text || '|' || count(DISTINCT qp.id)::text
        || '|' || bool_and(qp.technique_id='laser-atual' AND qp.notes LIKE '%reenviada e aprovada%')::text
      FROM public.quotes q JOIN public.quote_items qi ON qi.quote_id = q.id
      LEFT JOIN public.quote_item_personalizations qp ON qp.quote_item_id = qi.id
      WHERE q.id = '{quote_id}'
      GROUP BY q.id;
    """))
    assert persisted == f"true|{PA}|{COOPERATIVE}|{ORG}|68.00|1|1|true", persisted
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"
    result["atomicidade_e_hierarquia"] = "orçamento, item e personalização reprecificada gravados juntos; PA não foi escrito em client_id; hierarquia veio do pedido; arte marcada para nova aprovação"
    lookup_quote_id = scalar(sql(f"""
      SELECT public.get_sicoob_reorder_idempotency(
        '{CREATOR}', '{ORDER}', 'recompra-teste-0001', '{request_hash()}'
      );
    """))
    assert lookup_quote_id == quote_id
    result["idempotencia"] = "retry após resposta perdida ignorou mudanças posteriores de nome, preço e data do catálogo e não duplicou o orçamento"

    changed_payload = payload(price=26)
    changed = actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${changed_payload}$payload$::jsonb, 'recompra-teste-0001', '{CREATOR}', '{request_hash("outro-pedido")}'
      );
    """, check=False)
    assert changed.returncode != 0 and "conteúdo diferente" in changed.stderr

    unauthorized = actor_sql(UNAUTHORIZED, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${first_payload}$payload$::jsonb, 'recompra-teste-0002', '{UNAUTHORIZED}', '{request_hash()}'
      );
    """, check=False)
    assert unauthorized.returncode != 0 and "não pode refazer" in unauthorized.stderr

    stale_payload = payload(checked="now() - interval '10 minutes'")
    stale = actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${stale_payload}$payload$::jsonb, 'recompra-teste-0003', '{CREATOR}', '{request_hash()}'
      );
    """, check=False)
    assert stale.returncode != 0 and "consultados novamente" in stale.stderr
    result["guardas"] = "RPC indisponível ao navegador; conteúdo divergente, usuário fora do escopo e consulta de catálogo vencida foram recusados"

    sql("""
      CREATE FUNCTION public.fail_reorder_item() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.product_name = 'FALHA FORÇADA' THEN RAISE EXCEPTION 'falha sintética de item'; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER tr_fail_reorder_item BEFORE INSERT ON public.quote_items
      FOR EACH ROW EXECUTE FUNCTION public.fail_reorder_item();
    """)
    failing_payload = payload(name="FALHA FORÇADA")
    failed = actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_order_as_quote(
        '{ORDER}', $payload${failing_payload}$payload$::jsonb, 'recompra-teste-0004', '{CREATOR}', '{request_hash()}'
      );
    """, check=False)
    assert failed.returncode != 0 and "falha sintética" in failed.stderr
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"
    assert scalar(sql("SELECT count(*) FROM public.sicoob_reorder_requests;")) == "1"
    result["rollback"] = "falha forçada no item não deixou cabeçalho nem registro idempotente órfão"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/recompra-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
