"""Valida documentos privados e aprovação versionada de arte sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-finance-art-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-finance-artwork-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260912180000_sicoob_finance_artwork.sql"
CREATOR = "11111111-1111-1111-1111-111111111111"
APPROVER = "22222222-2222-2222-2222-222222222222"
ORDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
HASH1 = "a" * 64
HASH2 = "b" * 64


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
      INSERT INTO auth.users VALUES ('{CREATOR}'), ('{APPROVER}');
      INSERT INTO public.user_roles VALUES ('{APPROVER}', 'supervisor');
      INSERT INTO public.sicoob_orders VALUES ('{ORDER}', '{CREATOR}', 'confirmed', 125.50, true);
    """)

    invoice_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.add_sicoob_order_invoice(
        '{ORDER}', 'NF-0001', 'pdf', '{ORDER}/invoices/nota.pdf', 125.50, NULL, CURRENT_DATE
      );
    """))
    invoice = scalar(sql(f"""
      SELECT order_id::text || '|' || invoice_number || '|' || amount::text || '|' || file_path
      FROM public.sicoob_order_invoices WHERE id = '{invoice_id}';
    """))
    assert invoice == f"{ORDER}|NF-0001|125.50|{ORDER}/invoices/nota.pdf", invoice
    assert scalar(sql("SELECT public FROM storage.buckets WHERE id='sicoob-order-documents';")) == "f"
    result["documentos"] = "nota vinculada ao pedido Sicoob e bucket privado preservado"

    payment_id = scalar(actor_sql(CREATOR, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'pending', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """))
    actor_sql(CREATOR, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'paid', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """)
    payment = scalar(sql(f"""
      SELECT status || '|' || amount::text || '|' || (paid_at IS NOT NULL)::text || '|' || external_reference
      FROM public.sicoob_order_payments WHERE id = '{payment_id}';
    """))
    assert payment == "paid|125.50|true|ERP-0001", payment
    direct_payment_tamper = sql(f"UPDATE public.sicoob_order_payments SET amount=1 WHERE id='{payment_id}';", check=False)
    assert direct_payment_tamper.returncode != 0 and "fluxo financeiro formal" in direct_payment_tamper.stderr
    paid_rewrite = actor_sql(CREATOR, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 100, CURRENT_DATE, 'paid', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """, check=False)
    assert paid_rewrite.returncode != 0 and "Parcela liquidada" in paid_rewrite.stderr
    over_total = actor_sql(CREATOR, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 2, 1, CURRENT_DATE, 'pending', NULL, NULL, 'ERP-0002', NULL
      );
    """, check=False)
    assert over_total.returncode != 0 and "supera o valor" in over_total.stderr
    result["pagamentos"] = "parcela conciliada por RPC; soma limitada ao pedido; registro liquidado e escrita direta protegidos"

    artwork1 = scalar(actor_sql(CREATOR, f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{ORDER}', '{ORDER}/artwork/v1.pdf', '{HASH1}', '{{"brand":"Sicoob","logo":"v1"}}'::jsonb
      );
    """))
    self_decision = actor_sql(CREATOR, f"""
      SELECT public.decide_sicoob_order_artwork('{artwork1}', 'approved', NULL);
    """, check=False)
    assert self_decision.returncode != 0 and "Aprovador inválido" in self_decision.stderr
    actor_sql(APPROVER, f"SELECT public.decide_sicoob_order_artwork('{artwork1}', 'approved', NULL);")

    artwork2 = scalar(actor_sql(CREATOR, f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{ORDER}', '{ORDER}/artwork/v2.pdf', '{HASH2}', '{{"brand":"Sicoob","logo":"v2"}}'::jsonb
      );
    """))
    versions = scalar(sql(f"""
      SELECT string_agg(version || ':' || status || ':' || is_latest, ',' ORDER BY version)
      FROM public.sicoob_order_artwork_versions WHERE order_id = '{ORDER}';
    """))
    assert versions == "1:approved:false,2:pending:true", versions

    blocked = sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{ORDER}';", check=False)
    assert blocked.returncode != 0 and "arte precisa estar aprovada" in blocked.stderr
    direct_tamper = sql(f"UPDATE public.sicoob_order_artwork_versions SET file_sha256='{HASH1}' WHERE id='{artwork2}';", check=False)
    assert direct_tamper.returncode != 0 and "imutável" in direct_tamper.stderr
    actor_sql(APPROVER, f"SELECT public.decide_sicoob_order_artwork('{artwork2}', 'approved', NULL);")
    sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{ORDER}';")
    result["arte"] = "autoaprovação recusada; versões e identidade preservadas; produção bloqueada até aprovação da versão vigente"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/financeiro-arte-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
