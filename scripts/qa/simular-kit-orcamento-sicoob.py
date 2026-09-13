"""Valida atomicidade, idempotência e escopo da conversão de kit em orçamento."""
from pathlib import Path
import json
import subprocess
import time
import uuid
import hashlib
from postgres_ready import wait_for_postgres

CONTAINER = "sicoob-kit-orcamento-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-reorder-fixture.sql"
REORDER_MIGRATION = ROOT / "supabase/migrations/20260912170000_sicoob_reorder_atomic.sql"
MIGRATION = ROOT / "supabase/migrations/20260912200000_sicoob_kit_quote_atomic.sql"

ACTOR = "11111111-1111-1111-1111-111111111111"
INACTIVE = "22222222-2222-2222-2222-222222222222"
COOPERATIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ORG = "cccccccc-cccc-cccc-cccc-cccccccccccc"
BOX = "dddddddd-dddd-dddd-dddd-dddddddddddd"
PRODUCT = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"


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


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line != "SET"]
    if not values:
        raise RuntimeError("A consulta não retornou o valor esperado")
    return values[-1]


def checked_at(expression="now()"):
    return scalar(sql(f"SELECT ({expression})::timestamptz;"))


def kit_payload():
    return {"name": "Kit Boas-vindas", "type": "montado", "quantity": 3, "identity_tag": "NOVOS COOPERADOS"}


def items_payload(*, price=24.5, name="Caneca vigente", checked=None):
    stamp = checked or checked_at()
    return [
        {
            "line_id": "box", "kind": "box", "product_id": BOX,
            "product_name": "Caixa vigente", "product_sku": "BOX-ATUAL",
            "quantity": 3, "unit_price": 12, "minimum_quantity": 1,
            "source_variant_id": None, "catalog_checked_at": stamp,
        },
        {
            "line_id": "item:0", "kind": "item", "product_id": PRODUCT,
            "product_name": name, "product_sku": "CAN-VD",
            "quantity": 6, "unit_price": price, "minimum_quantity": 5,
            "source_variant_id": "variante-1", "source_variant_sku": "CAN-VD",
            "color_name": "Verde", "color_hex": "#00A091", "catalog_checked_at": stamp,
        },
    ]


def personalizations_payload(*, checked=None, quantity=6):
    return [{
        "line_id": "item:0", "technique_id": "tech-1", "technique_name": "Laser vigente",
        "colors_count": 1, "width_cm": 3, "height_cm": 2,
        "personalized_quantity": quantity, "unit_cost": 3,
        "setup_cost": 10, "total_cost": 18, "position": "Lado A",
        "catalog_checked_at": checked or checked_at(),
    }]


def request_hash(suffix="original"):
    return hashlib.sha256(f"intencao-estavel:{suffix}".encode()).hexdigest()


def call_rpc(actor, key, items, personalizations, *, hash_value=None, check=True):
    kit = json.dumps(kit_payload(), ensure_ascii=False)
    items_json = json.dumps(items, ensure_ascii=False)
    pers_json = json.dumps(personalizations, ensure_ascii=False)
    return sql(f"""
      SELECT public.create_sicoob_kit_quote(
        $kit${kit}$kit$::jsonb,
        $items${items_json}$items$::jsonb,
        $pers${pers_json}$pers$::jsonb,
        '{key}',
        '{actor}',
        '{hash_value or request_hash()}'
      );
    """, check=check)


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
    sql(REORDER_MIGRATION.read_text())
    sql(MIGRATION.read_text())
    sql(f"""
      INSERT INTO public.cooperativas VALUES ('{COOPERATIVE}', 'Cooperativa sintética');
      INSERT INTO public.postos_atendimento VALUES ('{PA}', '{COOPERATIVE}', 'PA sintético');
      INSERT INTO public.organizations VALUES ('{ORG}');
      INSERT INTO public.profiles (user_id, cooperativa_id, pa_id, organization_id, is_active) VALUES
        ('{ACTOR}', '{COOPERATIVE}', '{PA}', '{ORG}', true),
        ('{INACTIVE}', '{COOPERATIVE}', '{PA}', '{ORG}', false);
    """)

    privileges = scalar(sql("""
      SELECT has_function_privilege('authenticated', 'public.create_sicoob_kit_quote(jsonb,jsonb,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('anon', 'public.create_sicoob_kit_quote(jsonb,jsonb,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('service_role', 'public.create_sicoob_kit_quote(jsonb,jsonb,jsonb,text,uuid,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('authenticated', 'public.get_sicoob_kit_quote_idempotency(uuid,text,text)', 'EXECUTE')::text
        || '|' || has_function_privilege('service_role', 'public.get_sicoob_kit_quote_idempotency(uuid,text,text)', 'EXECUTE')::text;
    """))
    assert privileges == "false|false|true|false|true", privileges

    first = json.loads(scalar(call_rpc(
        ACTOR,
        "kit-orcamento-0001",
        items_payload(),
        personalizations_payload(),
    )))
    retried = json.loads(scalar(call_rpc(
        ACTOR,
        "kit-orcamento-0001",
        items_payload(price=25, name="Caneca atualizada", checked=checked_at("now() + interval '1 second'")),
        personalizations_payload(checked=checked_at("now() + interval '1 second'")),
    )))
    assert first["quote_id"] == retried["quote_id"]
    assert float(first["total"]) == 201.0
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"

    persisted = scalar(sql(f"""
      SELECT q.total::text || '|' || q.organization_id::text || '|' || q.pa_id::text
        || '|' || q.singular_id::text || '|' || count(DISTINCT qi.id)::text
        || '|' || count(DISTINCT qp.id)::text || '|' || bool_and(q.notes LIKE '%não reservado%')::text
      FROM public.quotes q
      JOIN public.quote_items qi ON qi.quote_id = q.id
      LEFT JOIN public.quote_item_personalizations qp ON qp.quote_item_id = qi.id
      WHERE q.id = '{first["quote_id"]}'
      GROUP BY q.id;
    """))
    assert persisted == f"201.00|{ORG}|{PA}|{COOPERATIVE}|2|1|true", persisted
    result["atomicidade_e_total"] = "cabeçalho, dois itens e personalização persistidos juntos; total servidor de R$ 201,00"
    lookup = json.loads(scalar(sql(f"""
      SELECT public.get_sicoob_kit_quote_idempotency(
        '{ACTOR}', 'kit-orcamento-0001', '{request_hash()}'
      );
    """)))
    assert lookup["quote_id"] == first["quote_id"]
    result["idempotencia"] = "retry após resposta perdida devolveu o mesmo orçamento, mesmo após mudança de timestamp, nome e preço do catálogo"

    split_minimum = items_payload()
    split_minimum[1]["quantity"] = 3
    split_minimum.append({**split_minimum[1], "line_id": "item:1"})
    aggregated_minimum = json.loads(scalar(call_rpc(
        ACTOR,
        "kit-orcamento-0006",
        split_minimum,
        [],
    )))
    assert aggregated_minimum["quote_id"] != first["quote_id"]
    result["quantidade_minima"] = "duas linhas abaixo do MOQ individual foram aceitas porque a soma do produto atingiu o mínimo"

    changed = call_rpc(
        ACTOR,
        "kit-orcamento-0001",
        items_payload(price=25),
        personalizations_payload(),
        hash_value=request_hash("conteudo-alterado"),
        check=False,
    )
    assert changed.returncode != 0 and "conteúdo diferente" in changed.stderr

    inactive = call_rpc(
        INACTIVE,
        "kit-orcamento-0002",
        items_payload(),
        personalizations_payload(),
        check=False,
    )
    assert inactive.returncode != 0 and "perfil ativo" in inactive.stderr

    stale_stamp = checked_at("now() - interval '10 minutes'")
    stale = call_rpc(
        ACTOR,
        "kit-orcamento-0003",
        items_payload(checked=stale_stamp),
        personalizations_payload(checked=stale_stamp),
        check=False,
    )
    assert stale.returncode != 0 and "consultados novamente" in stale.stderr

    mismatch = call_rpc(
        ACTOR,
        "kit-orcamento-0004",
        items_payload(),
        personalizations_payload(quantity=5),
        check=False,
    )
    assert mismatch.returncode != 0 and "não corresponde" in mismatch.stderr
    result["guardas"] = "RPC privada; perfil inativo, catálogo vencido, conteúdo divergente e personalização incompatível recusados"

    sql("""
      CREATE FUNCTION public.fail_kit_quote_item() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.product_name = 'FALHA FORÇADA' THEN RAISE EXCEPTION 'falha sintética de item'; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER tr_fail_kit_quote_item BEFORE INSERT ON public.quote_items
      FOR EACH ROW EXECUTE FUNCTION public.fail_kit_quote_item();
    """)
    failed = call_rpc(
        ACTOR,
        "kit-orcamento-0005",
        items_payload(name="FALHA FORÇADA"),
        personalizations_payload(),
        check=False,
    )
    assert failed.returncode != 0 and "falha sintética" in failed.stderr
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "2"
    assert scalar(sql("SELECT count(*) FROM public.sicoob_kit_quote_requests;")) == "2"
    result["rollback"] = "falha forçada no item não deixou cabeçalho nem idempotência órfãos"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/kit-orcamento-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
