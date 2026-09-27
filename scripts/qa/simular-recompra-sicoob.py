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
QUOTE_VERSIONING_FOLLOWUP = ROOT / "supabase/migrations/20260913120001_quote_versioning_atomic_followup.sql"
FOLLOWUP_MIGRATION = ROOT / "supabase/migrations/20260913120002_sicoob_reorder_atomic_followup.sql"
VALIDITY_MIGRATION = ROOT / "supabase/migrations/20260927210000_sicoob_reorder_catalog_validity.sql"

CREATOR = "11111111-1111-1111-1111-111111111111"
UNAUTHORIZED = "22222222-2222-2222-2222-222222222222"
COOPERATIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ORG = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ORDER = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ITEM = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
PRODUCT = "ffffffff-ffff-ffff-ffff-ffffffffffff"
SOURCE_QUOTE = "99999999-9999-4999-8999-999999999999"
SOURCE_QUOTE_ITEM = "88888888-8888-4888-8888-888888888888"


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


def payload(*, name="Caneca vigente", price=25, checked="now()", source_item_id=ITEM):
    checked_value = scalar(sql(f"SELECT ({checked})::timestamptz;"))
    return json.dumps([{
        "source_order_item_id": source_item_id,
        "product_id": PRODUCT,
        "product_name": name,
        "product_sku": "CAN-ATUAL",
        "quantity": 2,
        "unit_price": price,
        "minimum_quantity": 1,
        "available_stock": 20,
        "historical_unit_price": 10,
        "price_changed": price != 10,
        "stock_is_reserved": False,
        "source_variant_id": None,
        "catalog_checked_at": checked_value,
        "catalog_valid_until": scalar(sql(f"SELECT (({checked})::timestamptz + interval '5 minutes');")),
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


def quote_request_hash(suffix=SOURCE_QUOTE):
    return hashlib.sha256(json.dumps({"source_quote_id": suffix}, separators=(",", ":")).encode()).hexdigest()


EVIDENCE = ROOT / "docs/execucao/evidencias/recompra-sicoob.json"
result = json.loads(EVIDENCE.read_text()) if EVIDENCE.exists() else {}
simulation = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migracoes": [
        str(MIGRATION.relative_to(ROOT)),
        str(QUOTE_VERSIONING_FOLLOWUP.relative_to(ROOT)),
        str(FOLLOWUP_MIGRATION.relative_to(ROOT)),
        str(VALIDITY_MIGRATION.relative_to(ROOT)),
    ],
}
result["simulacao_local"] = simulation

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine",
    ])
    wait_for_postgres(command, CONTAINER)

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(QUOTE_VERSIONING_FOLLOWUP.read_text())
    sql(FOLLOWUP_MIGRATION.read_text())
    sql(VALIDITY_MIGRATION.read_text())
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
        || '|' || q.reorder_source_order_id::text
        || '|' || (q.catalog_valid_until > q.catalog_revalidated_at)::text
        || '|' || q.catalog_stock_is_reserved::text
        || '|' || bool_and(qi.catalog_available_stock=20 AND qi.price_changed AND qi.catalog_stock_is_reserved=false)::text
      FROM public.quotes q JOIN public.quote_items qi ON qi.quote_id = q.id
      LEFT JOIN public.quote_item_personalizations qp ON qp.quote_item_id = qi.id
      WHERE q.id = '{quote_id}'
      GROUP BY q.id;
    """))
    assert persisted == f"true|{PA}|{COOPERATIVE}|{ORG}|68.00|1|1|true|{ORDER}|true|false|true", persisted
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"
    simulation["atomicidade_e_hierarquia"] = "orçamento, item e personalização reprecificada gravados juntos; origem, diferença de preço e validade ficaram auditáveis; PA não foi escrito em client_id; arte exige nova aprovação"
    lookup_quote_id = scalar(sql(f"""
      SELECT public.get_sicoob_reorder_idempotency(
        '{CREATOR}', '{ORDER}', 'recompra-teste-0001', '{request_hash()}'
      );
    """))
    assert lookup_quote_id == quote_id
    simulation["idempotencia"] = "retry após resposta perdida ignorou mudanças posteriores de nome, preço e data do catálogo e não duplicou o orçamento"

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
    simulation["guardas"] = "RPC indisponível ao navegador; conteúdo divergente, usuário fora do escopo e consulta de catálogo vencida foram recusados"

    sql(f"""
      UPDATE public.quotes
      SET catalog_revalidated_at=now()-interval '10 minutes',
          catalog_valid_until=now()-interval '5 minutes'
      WHERE id='{quote_id}';
      UPDATE public.quote_items
      SET catalog_valid_until=now()-interval '5 minutes'
      WHERE quote_id='{quote_id}';
    """)
    stale_transition = sql(f"UPDATE public.quotes SET status='pending' WHERE id='{quote_id}';", check=False)
    assert stale_transition.returncode != 0 and "revalide o catálogo" in stale_transition.stderr

    refreshed_payload = payload(price=27)
    refreshed_quote_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.refresh_sicoob_reorder_quote(
        '{quote_id}', $payload${refreshed_payload}$payload$::jsonb, '{CREATOR}'
      );
    """))
    assert refreshed_quote_id == quote_id
    refreshed = scalar(sql(f"""
      SELECT qi.unit_price::text || '|' || q.reorder_price_changed_items::text
        || '|' || (q.catalog_valid_until > now())::text || '|' || q.catalog_stock_is_reserved::text
      FROM public.quotes q JOIN public.quote_items qi ON qi.quote_id=q.id
      WHERE q.id='{quote_id}';
    """))
    assert refreshed == "27|1|true|false", refreshed
    simulation["validade_explicita"] = "transição com consulta vencida foi recusada; nova consulta substituiu o snapshot atomicamente; estoque continuou informativo e não reservado"

    sql(f"""
      INSERT INTO public.quotes (
        id, client_name, seller_id, status, subtotal, total, organization_id, pa_id, singular_id
      ) VALUES (
        '{SOURCE_QUOTE}', 'Cliente histórico', '{CREATOR}', 'approved', 20, 20, '{ORG}', '{PA}', '{COOPERATIVE}'
      );
      INSERT INTO public.quote_items (
        id, quote_id, product_id, product_name, quantity, unit_price, sort_order
      ) VALUES (
        '{SOURCE_QUOTE_ITEM}', '{SOURCE_QUOTE}', '{PRODUCT}', 'Caneca histórica do orçamento', 2, 10, 0
      );
    """)
    quote_payload = payload(price=31, source_item_id=SOURCE_QUOTE_ITEM)
    requote_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.reorder_sicoob_quote_as_quote(
        '{SOURCE_QUOTE}', $payload${quote_payload}$payload$::jsonb,
        'recompra-orcamento-0001', '{CREATOR}', '{quote_request_hash()}'
      );
    """))
    requote = scalar(sql(f"""
      SELECT q.reorder_source_quote_id::text || '|' || qi.unit_price::text
        || '|' || qi.historical_unit_price::text || '|' || qi.price_changed::text
        || '|' || q.catalog_stock_is_reserved::text
      FROM public.quotes q JOIN public.quote_items qi ON qi.quote_id=q.id
      WHERE q.id='{requote_id}';
    """))
    assert requote == f"{SOURCE_QUOTE}|31|10.0000|true|false", requote
    assert scalar(sql(f"SELECT unit_price::text FROM public.quote_items WHERE id='{SOURCE_QUOTE_ITEM}';")) == "10"
    assert scalar(sql("SELECT count(*) FROM public.sicoob_quote_reorder_requests;")) == "1"
    simulation["recompra_de_orcamento"] = "orçamento aprovado foi usado apenas como referência; nova proposta recebeu preço vigente e a origem histórica permaneceu imutável"

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
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "3"
    assert scalar(sql("SELECT count(*) FROM public.sicoob_reorder_requests;")) == "1"
    simulation["rollback"] = "falha forçada no item não deixou cabeçalho nem registro idempotente órfão"

    simulation["resultado"] = "aprovado"
    EVIDENCE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
