"""Prova atomicidade, RLS, recálculo e concorrência do salvamento de orçamento."""
from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "quote-atomic-save-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/quote-atomic-save-fixture.sql"
BASE_MIGRATION = ROOT / "supabase/migrations/20261002160000_quote_items_id_format_validation.sql"
GOVERNANCE_MIGRATION = ROOT / "supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql"
MIGRATION = ROOT / "supabase/migrations/20261013123000_preserve_atomic_quote_save_under_governance.sql"
SELLER = "11111111-1111-4111-8111-111111111111"
ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
OTHER_ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"


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


def actor_sql(statement, *, check=True):
    return sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub = '{SELLER}';\n{statement}\nRESET ROLE;",
        check=check,
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in {"SET", "RESET"}]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


def quote_payload(*, org=ORG, quantity=2, failing=False):
    personalizations = [{
        "technique_id": "silk",
        "technique_name": "Silk",
        "colors_count": 1,
        "positions_count": 1,
        "personalized_quantity": quantity,
        "setup_cost": 1,
        "unit_cost": 1,
        "total_cost": 5,
    }]
    real_subtotal = quantity * 10 + 5
    subtotal = round(real_subtotal * 1.2, 2)
    discount = round(subtotal * 0.1, 2)
    total_cost = quantity * 6 + 1 + quantity
    items = [{
        "product_id": "produto-1",
        "product_name": "Caneca",
        "quantity": quantity,
        "unit_price": 10,
        "unit_cost": 6,
        "personalizations": personalizations,
    }]
    if failing:
        items.append({
            "product_id": "produto-falha",
            "product_name": "FALHAR",
            "quantity": 1,
            "unit_price": 0,
            "unit_cost": 0,
            "personalizations": [],
        })
    header = {
        "organization_id": org,
        "status": "draft",
        "client_name": "Cooperativa de teste",
        "negotiation_markup_percent": 20,
        "discount_percent": 10,
        "discount_amount": discount,
        "shipping_type": "fob",
        "shipping_cost": 2,
        "subtotal": subtotal,
        "total": round(subtotal - discount + 2, 2),
        "total_cost": total_cost,
    }
    if failing:
        # O segundo item tem valor zero; os totais continuam válidos e a falha
        # ocorre durante a segunda passagem, depois de o cabeçalho ser escrito.
        pass
    return header, items


def rpc(header, items, *, quote_id=None, version=None, history=None, check=True):
    quote_sql = json.dumps(header, ensure_ascii=False, separators=(",", ":"))
    items_sql = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    history_sql = json.dumps(history or ["Registro transacional de teste"], ensure_ascii=False)
    quote_id_sql = "NULL" if quote_id is None else f"'{quote_id}'::uuid"
    version_sql = "NULL" if version is None else str(version)
    return actor_sql(
        "SELECT public.save_quote_atomic("
        f"$quote${quote_sql}$quote$::jsonb, $items${items_sql}$items$::jsonb, "
        f"{quote_id_sql}, {version_sql}, $history${history_sql}$history$::jsonb);",
        check=check,
    )


result = {
    "ambiente": "PostgreSQL 17 descartável, --network none; dados sintéticos",
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
    sql(BASE_MIGRATION.read_text())
    governance_sql = GOVERNANCE_MIGRATION.read_text()
    guard_start = governance_sql.index(
        "CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()"
    )
    guard_end = governance_sql.index(
        "CREATE OR REPLACE FUNCTION public.assert_quote_content_editable", guard_start
    )
    sql(governance_sql[guard_start:guard_end])
    sql(MIGRATION.read_text())

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

    header, items = quote_payload()
    created = json.loads(scalar(rpc(header, items, history=["Orçamento criado atomicamente"])))
    quote_id = created["id"]
    assert created["seller_id"] == SELLER
    assert created["subtotal"] == 30
    assert created["total"] == 29
    assert created["total_cost"] == 15
    assert scalar(sql(f"SELECT count(*) FROM public.quote_items WHERE quote_id='{quote_id}';")) == "1"
    assert scalar(sql("SELECT count(*) FROM public.quote_item_personalizations;")) == "1"
    assert scalar(sql(f"SELECT action || '|' || description FROM public.quote_history WHERE quote_id='{quote_id}';")) == "created|Orçamento criado atomicamente"

    failing_header, failing_items = quote_payload(failing=True)
    failed_create = rpc(failing_header, failing_items, check=False)
    assert failed_create.returncode != 0 and "quote_items_product_name_check" in failed_create.stderr
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"
    assert scalar(sql("SELECT count(*) FROM public.quote_items;")) == "1"

    failed_update = rpc(failing_header, failing_items, quote_id=quote_id, version=1, check=False)
    assert failed_update.returncode != 0 and "quote_items_product_name_check" in failed_update.stderr
    assert scalar(sql(f"SELECT row_version FROM public.quotes WHERE id='{quote_id}';")) == "1"
    assert scalar(sql(f"SELECT product_name || '|' || quantity FROM public.quote_items WHERE quote_id='{quote_id}';")) == "Caneca|2"

    updated_header, updated_items = quote_payload(quantity=3)
    updated = json.loads(scalar(rpc(
        updated_header, updated_items, quote_id=quote_id, version=1,
        history=["Quantidade de Caneca alterada: 2 -> 3"],
    )))
    assert updated["row_version"] == 2
    assert updated["subtotal"] == 42
    assert updated["total"] == 39.8
    assert updated["total_cost"] == 22
    assert scalar(sql(f"SELECT quantity FROM public.quote_items WHERE quote_id='{quote_id}';")) == "3"
    assert scalar(sql(f"SELECT count(*) FROM public.quote_history WHERE quote_id='{quote_id}';")) == "2"

    direct_touch = actor_sql(
        f"UPDATE public.quotes SET updated_at=now()+interval '1 minute' WHERE id='{quote_id}';",
        check=False,
    )
    spoofed_touch = actor_sql(
        "BEGIN; SELECT set_config('app.quote_atomic_save','true',true); "
        f"UPDATE public.quotes SET updated_at=now()+interval '1 minute' WHERE id='{quote_id}'; "
        "COMMIT;",
        check=False,
    )
    assert direct_touch.returncode != 0
    assert spoofed_touch.returncode != 0
    assert scalar(sql(f"SELECT row_version FROM public.quotes WHERE id='{quote_id}';")) == "2"

    stale = rpc(updated_header, updated_items, quote_id=quote_id, version=1, check=False)
    assert stale.returncode != 0 and "orçamento mudou" in stale.stderr.lower()
    assert scalar(sql(f"SELECT row_version FROM public.quotes WHERE id='{quote_id}';")) == "2"

    foreign_header, foreign_items = quote_payload(org=OTHER_ORG)
    cross_org = rpc(foreign_header, foreign_items, check=False)
    assert cross_org.returncode != 0 and "organização informada" in cross_org.stderr
    assert scalar(sql("SELECT count(*) FROM public.quotes;")) == "1"

    sql(
        "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
        f"UPDATE public.quotes SET status='pending' WHERE id='{quote_id}'; COMMIT;"
    )
    submitted = rpc(updated_header, updated_items, quote_id=quote_id, version=3, check=False)
    assert submitted.returncode != 0 and "nova versão" in submitted.stderr

    result.update({
        "acl": "anon sem EXECUTE; authenticated autorizado e sujeito a RLS",
        "atomicidade": "falha após cabeçalho e primeiro item reverte criação e atualização integralmente",
        "concorrencia": "row_version obsoleto recusado sem alterar itens ou histórico",
        "totais": "subtotal, desconto, frete e custo recalculados no servidor",
        "governanca": "escopo organizacional e edição de orçamento enviado recusados",
        "integracao_gate": "save_quote_atomic preserva SECURITY INVOKER/RLS; toque direto ou GUC forjado não altera updated_at",
        "resultado": "aprovado",
    })
    evidence = ROOT / "docs/execucao/evidencias/salvamento-orcamento-atomico.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
