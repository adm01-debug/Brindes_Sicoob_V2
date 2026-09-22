"""Valida documentos privados e aprovação versionada de arte sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-finance-art-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-finance-artwork-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260912180000_sicoob_finance_artwork.sql"
FOLLOWUP_MIGRATION = ROOT / "supabase/migrations/20260913120003_sicoob_finance_artwork_followup.sql"
POLICY_WRAPPER_MIGRATION = ROOT / "supabase/migrations/20260922224100_sicoob_storage_policy_wrapper.sql"
CREATOR = "11111111-1111-1111-1111-111111111111"
APPROVER = "22222222-2222-2222-2222-222222222222"
ORDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
HASH1 = "a" * 64
HASH2 = "b" * 64


def artwork_identity(path, digest):
    return json.dumps({
        "bucket": "sicoob-order-documents",
        "path": path,
        "sha256": digest,
        "byte_size": 128,
        "content_type": "application/pdf",
        "verified_at": "2026-09-12T12:00:00.000Z",
        "verifier": "sicoob-artwork-register",
    }, separators=(",", ":"))


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


def service_sql(statement, *, check=True):
    return sql(f"SET request.jwt.claim.role = 'service_role';\n{statement}", check=check)


def rls_actor_sql(actor, statement, *, check=True):
    return sql(f"SET ROLE authenticated;\nSET request.jwt.claim.sub = '{actor}';\n{statement}\nRESET ROLE;", check=check)


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
    wait_for_postgres(command, CONTAINER)

    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())
    sql(FOLLOWUP_MIGRATION.read_text())
    sql("""
      REVOKE EXECUTE ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid,uuid) FROM PUBLIC, anon, authenticated;
    """)
    sql(POLICY_WRAPPER_MIGRATION.read_text())
    sql(f"""
      INSERT INTO auth.users VALUES ('{CREATOR}'), ('{APPROVER}');
      INSERT INTO public.user_roles VALUES ('{APPROVER}', 'supervisor');
      INSERT INTO public.sicoob_orders VALUES ('{ORDER}', '{CREATOR}', 'confirmed', 125.50, true);
      GRANT USAGE ON SCHEMA public, storage TO authenticated;
      GRANT SELECT ON public.sicoob_orders TO authenticated;
      GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
    """)

    assert scalar(sql("""
      SELECT has_function_privilege(
        'authenticated', 'public.sicoob_actor_can_manage_fulfillment(uuid,uuid)', 'EXECUTE'
      )::text;
    """)) == "false"
    assert scalar(sql("""
      SELECT has_function_privilege(
        'authenticated', 'public.sicoob_current_actor_can_manage_fulfillment(uuid)', 'EXECUTE'
      )::text;
    """)) == "true"
    assert scalar(sql("""
      SELECT has_function_privilege(
        'authenticated',
        'public.create_sicoob_order_artwork_version(uuid,uuid,text,text,jsonb)',
        'EXECUTE'
      )::text;
    """)) == "false"
    assert scalar(sql("""
      SELECT has_function_privilege(
        'service_role',
        'public.create_sicoob_order_artwork_version(uuid,uuid,text,text,jsonb)',
        'EXECUTE'
      )::text;
    """)) == "true"
    rls_actor_sql(CREATOR, f"""
      INSERT INTO storage.objects (bucket_id, name, owner)
      VALUES ('sicoob-order-documents', '{ORDER}/invoices/orfao.pdf', '{CREATOR}');
      DELETE FROM storage.objects
      WHERE bucket_id='sicoob-order-documents' AND name='{ORDER}/invoices/orfao.pdf';
    """)
    assert scalar(sql("SELECT count(*) FROM storage.objects;")) == "0"

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
    assert scalar(sql("""
      SELECT count(*) FROM pg_policies
      WHERE schemaname='storage' AND tablename='objects'
        AND policyname='sicoob_order_documents_delete_orphan_invoice' AND cmd='DELETE';
    """)) == "1"
    result["documentos"] = "nota vinculada ao pedido Sicoob; bucket privado e remoção restrita de órfão preservados"

    unauthorized_payment = actor_sql(CREATOR, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'pending', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """, check=False)
    assert unauthorized_payment.returncode != 0 and "não pode registrar" in unauthorized_payment.stderr

    sql(f"INSERT INTO public.user_roles VALUES ('{CREATOR}', 'gestor_compras');")
    assert scalar(sql(f"SELECT public.sicoob_actor_can_manage_finance('{CREATOR}', '{ORDER}')::text;")) == "true"
    sql(f"DELETE FROM public.user_roles WHERE user_id = '{CREATOR}';")

    initial_refund = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'refunded', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """, check=False)
    assert initial_refund.returncode != 0 and "Dados da parcela" in initial_refund.stderr

    payment_id = scalar(actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'pending', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """))
    update_without_version = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'paid', '{invoice_id}', 'boleto', 'ERP-0001', NULL
      );
    """, check=False)
    assert update_without_version.returncode != 0 and "versão atual" in update_without_version.stderr
    pending_version = scalar(sql(f"SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}';"))
    actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'paid', '{invoice_id}', 'boleto', 'ERP-0001', '{pending_version}'
      );
    """)
    payment = scalar(sql(f"""
      SELECT status || '|' || amount::text || '|' || (paid_at IS NOT NULL)::text || '|' || external_reference
      FROM public.sicoob_order_payments WHERE id = '{payment_id}';
    """))
    assert payment == "paid|125.50|true|ERP-0001", payment
    direct_payment_tamper = sql(f"UPDATE public.sicoob_order_payments SET amount=1 WHERE id='{payment_id}';", check=False)
    assert direct_payment_tamper.returncode != 0 and "fluxo financeiro formal" in direct_payment_tamper.stderr
    paid_rewrite = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 100, CURRENT_DATE, 'paid', '{invoice_id}', 'boleto', 'ERP-0001',
        (SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}')
      );
    """, check=False)
    assert paid_rewrite.returncode != 0 and "Parcela liquidada" in paid_rewrite.stderr
    paid_invoice_rewrite = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'paid', NULL, 'boleto', 'ERP-0001',
        (SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}')
      );
    """, check=False)
    assert paid_invoice_rewrite.returncode != 0 and "Parcela liquidada" in paid_invoice_rewrite.stderr
    paid_method_rewrite = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 1, 125.50, CURRENT_DATE, 'paid', '{invoice_id}', 'pix', 'ERP-0001',
        (SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}')
      );
    """, check=False)
    assert paid_method_rewrite.returncode != 0 and "Parcela liquidada" in paid_method_rewrite.stderr
    over_total = actor_sql(APPROVER, f"""
      SELECT public.record_sicoob_order_payment(
        '{ORDER}', 2, 1, CURRENT_DATE, 'pending', NULL, NULL, 'ERP-0002', NULL
      );
    """, check=False)
    assert over_total.returncode != 0 and "supera o valor" in over_total.stderr
    paid_at = scalar(sql(f"SELECT paid_at FROM public.sicoob_order_payments WHERE id='{payment_id}';"))
    actor_sql(APPROVER, f"""
      SELECT public.refund_sicoob_order_payment(
        '{payment_id}', 'Cobrança duplicada identificada',
        (SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}')
      );
    """)
    refund = scalar(sql(f"""
      SELECT status || '|' || (paid_at = '{paid_at}'::timestamptz)::text || '|'
        || (refunded_at IS NOT NULL)::text || '|' || (refunded_by = '{APPROVER}')::text || '|' || refund_reason
      FROM public.sicoob_order_payments WHERE id='{payment_id}';
    """))
    assert refund == "refunded|true|true|true|Cobrança duplicada identificada", refund
    repeated_refund = actor_sql(APPROVER, f"""
      SELECT public.refund_sicoob_order_payment(
        '{payment_id}', 'Tentativa duplicada de estorno',
        (SELECT updated_at FROM public.sicoob_order_payments WHERE id='{payment_id}')
      );
    """, check=False)
    assert repeated_refund.returncode != 0 and "Somente uma parcela paga" in repeated_refund.stderr
    result["pagamentos"] = "ator sem papel financeiro recusado e gestor de compras reconhecido; criação em estornado e sobrescrita sem versão recusadas; fatura, método e valores de parcela liquidada imutáveis; soma limitada; estorno formal preservou quitação e gravou motivo, data e ator"

    artwork_path1 = f"{ORDER}/artwork/v1.pdf"
    forged_artwork = actor_sql(CREATOR, f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{CREATOR}', '{ORDER}', '{artwork_path1}', '{HASH1}',
        '{artwork_identity(artwork_path1, HASH1)}'::jsonb
      );
    """, check=False)
    assert forged_artwork.returncode != 0 and "verificador interno" in forged_artwork.stderr
    artwork1 = scalar(service_sql(f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{CREATOR}', '{ORDER}', '{artwork_path1}', '{HASH1}',
        '{artwork_identity(artwork_path1, HASH1)}'::jsonb
      );
    """))
    artwork1_retry = scalar(service_sql(f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{CREATOR}', '{ORDER}', '{artwork_path1}', '{HASH1}',
        '{artwork_identity(artwork_path1, HASH1)}'::jsonb
      );
    """))
    assert artwork1_retry == artwork1
    assert scalar(sql(f"SELECT count(*) FROM public.sicoob_order_artwork_versions WHERE order_id='{ORDER}';")) == "1"
    self_decision = actor_sql(CREATOR, f"""
      SELECT public.decide_sicoob_order_artwork('{artwork1}', 'approved', NULL);
    """, check=False)
    assert self_decision.returncode != 0 and "Aprovador inválido" in self_decision.stderr
    actor_sql(APPROVER, f"SELECT public.decide_sicoob_order_artwork('{artwork1}', 'approved', NULL);")

    artwork_path2 = f"{ORDER}/artwork/v2.pdf"
    artwork2 = scalar(service_sql(f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{CREATOR}', '{ORDER}', '{artwork_path2}', '{HASH2}',
        '{artwork_identity(artwork_path2, HASH2)}'::jsonb
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
    artwork_path3 = f"{ORDER}/artwork/v3.pdf"
    late_artwork = service_sql(f"""
      SELECT public.create_sicoob_order_artwork_version(
        '{CREATOR}', '{ORDER}', '{artwork_path3}', '{HASH1}',
        '{artwork_identity(artwork_path3, HASH1)}'::jsonb
      );
    """, check=False)
    assert late_artwork.returncode != 0 and "após o início" in late_artwork.stderr
    result["arte"] = "chamada autenticada com identidade forjada recusada; hash e fotografia aceitos somente do verificador servidor; repetição idempotente; autoaprovação recusada; versões preservadas; produção bloqueada sem aprovação e nova arte recusada após logística"

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/financeiro-arte-sicoob.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
