"""Prova a preservação de identidade dos itens no salvamento atômico de orçamento."""
from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "quote-item-identity-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/quote-atomic-save-fixture.sql"
MIGRATIONS = [
    ROOT / "supabase/migrations/20260927190000_atomic_quote_save.sql",
    ROOT / "supabase/migrations/20261002120000_quote_items_identity_preservation.sql",
]
SELLER = "11111111-1111-4111-8111-111111111111"
OTHER_SELLER = "22222222-2222-4222-8222-222222222222"
ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


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


def actor_sql(statement, *, seller=SELLER, check=True):
    return sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub = '{seller}';\n{statement}\nRESET ROLE;",
        check=check,
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in {"SET", "RESET"}]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


def item(*, name, quantity=2, unit_price=10, unit_cost=6, item_id=None, pers_total=5):
    return {
        "id": item_id,
        "product_name": name,
        "quantity": quantity,
        "unit_price": unit_price,
        "unit_cost": unit_cost,
        "personalizations": [{
            "technique_name": "Silk",
            "colors_count": 1,
            "positions_count": 1,
            "personalized_quantity": quantity,
            "setup_cost": 1,
            "unit_cost": 1,
            "total_cost": pers_total,
        }] if pers_total else [],
    }


def payload(items, *, markup=20, discount_percent=10, shipping=2):
    real_subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
    real_subtotal += sum(sum(p["total_cost"] for p in i["personalizations"]) for i in items)
    total_cost = sum(i["quantity"] * i["unit_cost"] for i in items)
    total_cost += sum(sum(p["setup_cost"] + p["unit_cost"] * p["personalized_quantity"] for p in i["personalizations"]) for i in items)
    subtotal = round(real_subtotal * (1 + markup / 100), 2)
    discount = round(subtotal * discount_percent / 100, 2)
    return {
        "organization_id": ORG,
        "status": "draft",
        "client_name": "Cooperativa de teste",
        "negotiation_markup_percent": markup,
        "discount_percent": discount_percent,
        "discount_amount": discount,
        "shipping_type": "fob",
        "shipping_cost": shipping,
        "subtotal": subtotal,
        "total": round(subtotal - discount + shipping, 2),
        "total_cost": round(total_cost, 2),
    }


def rpc(header, items, *, quote_id=None, version=None, check=True, seller=SELLER):
    quote_sql = json.dumps(header, ensure_ascii=False, separators=(",", ":"))
    items_sql = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    quote_id_sql = "NULL" if quote_id is None else f"'{quote_id}'::uuid"
    version_sql = "NULL" if version is None else str(version)
    return actor_sql(
        "SELECT public.save_quote_atomic("
        f"$quote${quote_sql}$quote$::jsonb, $items${items_sql}$items$::jsonb, "
        f"{quote_id_sql}, {version_sql}, $history$[\"Histórico de teste\"]$history$::jsonb);",
        check=check,
        seller=seller,
    )


def item_rows(quote_id):
    response = sql(
        "SELECT id || '|' || product_name || '|' || quantity || '|' || sort_order "
        f"FROM public.quote_items WHERE quote_id='{quote_id}' ORDER BY sort_order;"
    )
    rows = []
    for line in response.stdout.splitlines():
        if not line or line in {"SET", "RESET"}:
            continue
        item_id, name, quantity, sort_order = line.split("|")
        rows.append({
            "id": item_id, "product_name": name,
            "quantity": int(quantity), "sort_order": int(sort_order),
        })
    return rows


result = {
    "ambiente": "PostgreSQL 17 descartável, --network none; dados sintéticos",
    "migracoes": [str(m.relative_to(ROOT)) for m in MIGRATIONS],
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

    assert scalar(sql("""
      SELECT has_function_privilege(
        'anon', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE'
      )::text;
    """)) == "false"
    assert scalar(sql("""
      SELECT has_function_privilege(
        'authenticated', 'public.save_quote_atomic(jsonb,jsonb,uuid,integer,jsonb)', 'EXECUTE'
      )::text;
    """)) == "true"

    # Criação: ids declarados são ignorados e nascem uuids novos.
    foreign_seed = str(uuid.uuid4())
    items = [item(name="Caneca", item_id=foreign_seed), item(name="Camiseta", quantity=3)]
    created = json.loads(scalar(rpc(payload(items), items)))
    quote_id = created["id"]
    rows = item_rows(quote_id)
    assert [r["product_name"] for r in rows] == ["Caneca", "Camiseta"]
    caneca_id, camiseta_id = rows[0]["id"], rows[1]["id"]
    assert caneca_id != foreign_seed
    assert scalar(sql("SELECT count(*) FROM public.quote_item_personalizations;")) == "2"

    # Edição preservando identidade: Caneca muda de lugar/quantidade, Camiseta
    # sai, Boné entra sem id e ganha uuid novo.
    edited = [
        item(name="Boné", quantity=1, unit_price=5, unit_cost=2, pers_total=0),
        item(name="Caneca", quantity=3, item_id=caneca_id),
    ]
    updated = json.loads(scalar(rpc(payload(edited), edited, quote_id=quote_id, version=1)))
    assert updated["row_version"] == 2
    rows = item_rows(quote_id)
    assert [r["product_name"] for r in rows] == ["Boné", "Caneca"]
    assert rows[1]["id"] == caneca_id and rows[1]["quantity"] == 3
    assert rows[0]["id"] not in {caneca_id, camiseta_id}
    assert scalar(sql(f"SELECT count(*) FROM public.quote_items WHERE id='{camiseta_id}';")) == "0"
    assert scalar(sql("""
      SELECT count(*) FROM public.quote_item_personalizations p
      JOIN public.quote_items i ON i.id = p.quote_item_id WHERE i.product_name='Caneca';
    """)) == "1"

    # A edição invalida a consulta ao catálogo da recompra (efeito do antigo
    # delete-recreate): campos de validade não sobrevivem ao save.
    sql(f"""
      UPDATE public.quote_items SET
        catalog_checked_at = now(),
        catalog_available_stock = 500,
        catalog_minimum_quantity = 2,
        catalog_valid_until = now() + interval '5 minutes',
        catalog_stock_is_reserved = false,
        historical_unit_price = 9.5,
        price_changed = true
      WHERE id = '{caneca_id}';
    """)
    catalog_edit = [item(name="Caneca", quantity=3, item_id=caneca_id)]
    catalog_result = json.loads(scalar(rpc(
        payload(catalog_edit), catalog_edit, quote_id=quote_id, version=2
    )))
    assert catalog_result["row_version"] == 3
    assert scalar(sql(f"""
      SELECT count(*) FROM public.quote_items WHERE id = '{caneca_id}'
      AND catalog_checked_at IS NULL AND catalog_valid_until IS NULL
      AND catalog_available_stock IS NULL AND catalog_minimum_quantity IS NULL
      AND catalog_stock_is_reserved = false
      AND historical_unit_price IS NULL AND price_changed = false;
    """)) == "1"

    # Id declarado que não pertence ao orçamento recusa a gravação inteira.
    stale_items = [item(name="Caneca", quantity=3, item_id=camiseta_id)]
    stale = rpc(payload(stale_items), stale_items, quote_id=quote_id, version=3, check=False)
    assert stale.returncode != 0 and "itens do orçamento mudaram" in stale.stderr
    rows = item_rows(quote_id)
    assert [r["product_name"] for r in rows] == ["Caneca"]
    assert scalar(sql(f"SELECT row_version FROM public.quotes WHERE id='{quote_id}';")) == "3"

    # Ids duplicados no payload são recusados.
    dup_items = [
        item(name="Caneca", quantity=3, item_id=caneca_id),
        item(name="Caneca 2", quantity=1, item_id=caneca_id),
    ]
    dup = rpc(payload(dup_items), dup_items, quote_id=quote_id, version=3, check=False)
    assert dup.returncode != 0 and "duplicados" in dup.stderr

    # Id com formato inválido é recusado.
    bad_items = [item(name="Caneca", quantity=3, item_id="nao-e-uuid")]
    bad = rpc(payload(bad_items), bad_items, quote_id=quote_id, version=3, check=False)
    assert bad.returncode != 0

    # Id de item de outro vendedor é invisível via RLS e recusado.
    sql(f"""
      INSERT INTO public.quotes (seller_id, organization_id, status)
      VALUES ('{OTHER_SELLER}', '{ORG}', 'draft') RETURNING id;
    """)
    other_quote = scalar(sql("SELECT id FROM public.quotes WHERE seller_id='" + OTHER_SELLER + "';"))
    sql(f"INSERT INTO public.quote_items (quote_id, product_name, quantity, unit_price) "
        f"VALUES ('{other_quote}', 'Item alheio', 1, 1) RETURNING id;")
    other_item = scalar(sql(f"SELECT id FROM public.quote_items WHERE quote_id='{other_quote}';"))
    cross_items = [item(name="Caneca", quantity=3, item_id=other_item)]
    cross = rpc(payload(cross_items), cross_items, quote_id=quote_id, version=3, check=False)
    assert cross.returncode != 0 and "itens do orçamento mudaram" in cross.stderr

    # Supervisor: enxerga/atualiza itens, mas o escopo de DELETE é só do dono.
    # DELETE filtrado pelo RLS deve falhar alto em vez de corromper o orçamento.
    sql("""
      DROP POLICY quote_owner ON public.quotes;
      CREATE POLICY quotes_select_all ON public.quotes FOR SELECT TO authenticated USING (true);
      CREATE POLICY quotes_update_all ON public.quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY quotes_insert_owner ON public.quotes FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
      DROP POLICY quote_item_owner ON public.quote_items;
      CREATE POLICY quote_items_select_all ON public.quote_items FOR SELECT TO authenticated USING (true);
      CREATE POLICY quote_items_update_all ON public.quote_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY quote_items_insert_all ON public.quote_items FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY quote_items_delete_owner ON public.quote_items FOR DELETE TO authenticated
        USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = auth.uid()));
    """)
    sup = rpc(payload([]), [], quote_id=quote_id, version=3, check=False, seller=OTHER_SELLER)
    assert sup.returncode != 0 and "Sem permissão para remover itens" in sup.stderr
    assert scalar(sql(f"SELECT row_version FROM public.quotes WHERE id='{quote_id}';")) == "3"
    assert [r["product_name"] for r in item_rows(quote_id)] == ["Caneca"]

    # Cliente antigo (sem id) continua funcionando: recria tudo.
    legacy = [item(name="Caneca", quantity=4)]
    legacy_result = json.loads(scalar(rpc(payload(legacy), legacy, quote_id=quote_id, version=3)))
    assert legacy_result["row_version"] == 4
    rows = item_rows(quote_id)
    assert len(rows) == 1 and rows[0]["id"] != caneca_id and rows[0]["quantity"] == 4

    result.update({
        "acl": "anon sem EXECUTE; authenticated autorizado e sujeito a RLS",
        "identidade": "itens com id são atualizados no lugar; ausentes saem; novos nascem com uuid",
        "catalogo": "edição invalida a consulta de catálogo do item (validade não sobrevive ao save)",
        "criacao": "ids declarados na criação são ignorados e substituídos por uuids novos",
        "conflito": "id fora do orçamento, duplicado, inválido ou de outro vendedor recusa a gravação inteira",
        "exclusao": "DELETE filtrado pelo RLS falha alto (42501) em vez de corromper o orçamento",
        "retrocompatibilidade": "payload sem ids mantém o comportamento anterior (recria itens)",
        "resultado": "aprovado",
    })
    evidence = ROOT / "docs/execucao/evidencias/identidade-itens-orcamento.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
