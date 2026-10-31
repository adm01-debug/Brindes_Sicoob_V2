"""Prova atomicidade, idempotência, autorização e recálculo da duplicação de pedido."""
from pathlib import Path
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "order-duplicate-atomic-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/order-duplicate-atomic-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20260927200207_duplicate_order_atomic.sql"
WEBHOOK_MIGRATION = ROOT / "supabase/migrations/20260927200500_atomic_order_webhook_guard.sql"
INDEX_MIGRATION = ROOT / "supabase/migrations/20260927201017_order_duplicate_fk_indexes.sql"
ACTOR = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
SOURCE = "aaaaaaaa-0000-4000-8000-000000000001"
FOREIGN_SOURCE = "aaaaaaaa-0000-4000-8000-000000000002"
EMPTY_SOURCE = "aaaaaaaa-0000-4000-8000-000000000003"
FAILING_SOURCE = "aaaaaaaa-0000-4000-8000-000000000004"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command([
        "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
        "-v", "ON_ERROR_STOP=1", "-At",
    ], stdin=statement, check=False)
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def actor_sql(statement, actor=ACTOR, *, check=True):
    return sql(
        "SET ROLE authenticated; "
        f"SET request.jwt.claim.sub = '{actor}'; "
        "SET request.jwt.claim.role = 'authenticated';\n"
        f"{statement}\nRESET ROLE;",
        check=check,
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in {"SET", "RESET"}]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


def duplicate(source, key, actor=ACTOR, *, check=True):
    return actor_sql(
        "SELECT row_to_json(d)::text FROM public.duplicate_order_atomic("
        f"'{source}'::uuid, '{key}'::uuid) d;",
        actor=actor,
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
    sql(MIGRATION.read_text())
    sql(WEBHOOK_MIGRATION.read_text())
    sql(INDEX_MIGRATION.read_text())

    sql(f"""
      INSERT INTO auth.users(id,email) VALUES
        ('{ACTOR}','ator@example.test'), ('{OTHER}','outro@example.test');
      INSERT INTO public.organizations(id) VALUES ('{ORG}');
      INSERT INTO public.profiles(user_id,email,full_name,role) VALUES
        ('{ACTOR}','ator@example.test','Ator QA','vendedor'),
        ('{OTHER}','outro@example.test','Outro QA','vendedor');
      INSERT INTO public.orders(
        id,seller_id,order_number,status,fulfillment_status,subtotal,
        discount_amount,shipping_cost,total,organization_id,client_name
      ) VALUES
        ('{SOURCE}','{ACTOR}','PED-2026-0001','rascunho','unfulfilled',999,3,2,999,'{ORG}','Cooperativa QA'),
        ('{FOREIGN_SOURCE}','{OTHER}','PED-2026-0002','rascunho','unfulfilled',10,0,0,10,'{ORG}','Outra cooperativa'),
        ('{EMPTY_SOURCE}','{ACTOR}','PED-2026-0003','rascunho','unfulfilled',0,0,0,0,'{ORG}','Sem itens'),
        ('{FAILING_SOURCE}','{ACTOR}','PED-2026-0004','rascunho','unfulfilled',5,0,0,5,'{ORG}','Falha injetada');
      INSERT INTO public.order_items(order_id,product_name,quantity,unit_price,organization_id) VALUES
        ('{SOURCE}','Caneca',2,10,'{ORG}'),
        ('{SOURCE}','Caderno',1,5,'{ORG}'),
        ('{FOREIGN_SOURCE}','Produto alheio',1,10,'{ORG}'),
        ('{FAILING_SOURCE}','FALHAR',1,5,'{ORG}');
      INSERT INTO public.order_logistics(order_id,tracking_code,carrier_name,actual_delivery,delivery_status,notes)
        VALUES ('{SOURCE}','RASTREIO-ANTIGO','Transportadora QA',now(),'delivered','Manter transportadora');
      INSERT INTO public.outbound_webhooks(active,events) VALUES (true,ARRAY['order.created']);
    """)

    assert scalar(sql("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='order_id';")) == "uuid"
    assert scalar(sql("SELECT count(*) FROM pg_constraint WHERE conname='order_items_order_id_fkey' AND contype='f';")) == "1"
    assert scalar(sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND NOT tgisinternal AND tgname IN ('tr_check_fulfillment_transition','tr_audit_order_status','tr_audit_order_status_change');")) == "0"
    assert scalar(sql("SELECT has_function_privilege('anon','public.duplicate_order_atomic(uuid,uuid)','EXECUTE')::text;")) == "false"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.duplicate_order_atomic(uuid,uuid)','EXECUTE')::text;")) == "true"
    assert scalar(sql("SELECT has_function_privilege('anon','public.log_order_audit_event(uuid,text,text,jsonb,uuid,text,text,text)','EXECUTE')::text;")) == "false"
    assert scalar(sql("SELECT has_function_privilege('authenticated','public.log_order_audit_event(uuid,text,text,jsonb,uuid,text,text,text)','EXECUTE')::text;")) == "true"
    assert scalar(sql("SELECT has_table_privilege('authenticated','public.order_duplicate_requests','SELECT')::text;")) == "false"
    assert scalar(sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='order_duplicate_requests' AND indexname IN ('idx_order_duplicate_requests_source_order','idx_order_duplicate_requests_duplicated_order');")) == "2"

    key = "99999999-0000-4000-8000-000000000001"
    webhooks_before = scalar(sql("SELECT count(*) FROM public.qa_http_calls;"))
    created = json.loads(scalar(duplicate(SOURCE, key)))
    duplicated_id = created["id"]
    assert created["status"] == "rascunho"
    assert created["fulfillment_status"] == "unfulfilled"
    assert float(created["subtotal"]) == 25
    assert float(created["total"]) == 24
    assert created["seller_id"] == ACTOR
    assert scalar(sql(f"SELECT count(*) FROM public.order_items WHERE order_id='{duplicated_id}';")) == "2"
    assert scalar(sql(f"SELECT tracking_code IS NULL AND actual_delivery IS NULL AND delivery_status='pending' FROM public.order_logistics WHERE order_id='{duplicated_id}';")) == "t"
    assert scalar(sql(f"SELECT count(*) FROM public.order_audit_events WHERE order_id='{duplicated_id}' AND event_type='ORDER_DUPLICATED';")) == "1"
    assert scalar(sql("SELECT count(*) FROM public.qa_http_calls;")) == webhooks_before

    repeated = json.loads(scalar(duplicate(SOURCE, key)))
    assert repeated["id"] == duplicated_id
    assert scalar(sql(f"SELECT count(*) FROM public.order_duplicate_requests WHERE idempotency_key='{key}';")) == "1"

    unauthorized = duplicate(FOREIGN_SOURCE, "99999999-0000-4000-8000-000000000002", check=False)
    assert unauthorized.returncode != 0 and "sem acesso" in unauthorized.stderr
    empty = duplicate(EMPTY_SOURCE, "99999999-0000-4000-8000-000000000003", check=False)
    assert empty.returncode != 0 and "não possui itens" in empty.stderr

    sql("""
      CREATE OR REPLACE FUNCTION public.qa_fail_copied_item()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.product_name = 'FALHAR' THEN RAISE EXCEPTION 'falha injetada em item'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER qa_fail_copied_item BEFORE INSERT ON public.order_items
        FOR EACH ROW EXECUTE FUNCTION public.qa_fail_copied_item();
    """)
    before_orders = scalar(sql("SELECT count(*) FROM public.orders;"))
    failed = duplicate(FAILING_SOURCE, "99999999-0000-4000-8000-000000000004", check=False)
    assert failed.returncode != 0 and "falha injetada em item" in failed.stderr
    assert scalar(sql("SELECT count(*) FROM public.orders;")) == before_orders
    assert scalar(sql("SELECT count(*) FROM public.order_duplicate_requests WHERE idempotency_key='99999999-0000-4000-8000-000000000004';")) == "0"
    sql("DROP TRIGGER qa_fail_copied_item ON public.order_items;")

    concurrency_key = "99999999-0000-4000-8000-000000000005"
    statement = (
        "SET ROLE authenticated; "
        f"SET request.jwt.claim.sub='{ACTOR}'; SET request.jwt.claim.role='authenticated'; "
        f"SELECT id FROM public.duplicate_order_atomic('{SOURCE}','{concurrency_key}');"
    )
    processes = [
        subprocess.Popen(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-XqAt", "-v", "ON_ERROR_STOP=1"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        for _ in range(2)
    ]
    outputs = [process.communicate(statement, timeout=30) for process in processes]
    assert all(process.returncode == 0 for process in processes), outputs
    returned_ids = [out.strip().splitlines()[-1] for out, _ in outputs]
    assert len(set(returned_ids)) == 1
    assert scalar(sql(f"SELECT count(*) FROM public.order_duplicate_requests WHERE idempotency_key='{concurrency_key}';")) == "1"

    assert actor_sql(f"UPDATE public.orders SET status='enviado_gestor' WHERE id='{duplicated_id}';").returncode == 0
    invalid_transition = actor_sql(f"UPDATE public.orders SET status='concluido' WHERE id='{duplicated_id}';", check=False)
    assert invalid_transition.returncode != 0 and "Transição de status inválida" in invalid_transition.stderr

    audit_id = scalar(actor_sql(
        f"SELECT public.log_order_audit_event('{duplicated_id}','comment','Comentário QA','{{}}',NULL,NULL,'comment',NULL);"
    ))
    assert len(audit_id) == 36
    assert scalar(sql(f"SELECT event_category FROM public.order_audit_events WHERE id='{audit_id}';")) == "comment"

    concurrent_id = returned_ids[0]
    sql(f"DELETE FROM public.orders WHERE id='{concurrent_id}';")
    assert scalar(sql(f"SELECT count(*) FROM public.order_items WHERE order_id='{concurrent_id}';")) == "0"

    result.update({
        "atomicidade": "falha injetada na cópia de item reverte cabeçalho, itens, logística, auditoria e chave",
        "idempotencia": "repetição e duas chamadas concorrentes retornam um único pedido",
        "totais": "subtotal e total são recalculados no servidor a partir dos itens",
        "autorizacao": "anon sem EXECUTE; UUID alheio e pedido vazio recusados",
        "integridade": "order_items usa uuid, FK real e cascata; estados e transições reconciliados",
        "efeitos_externos": "rascunho duplicado não dispara webhook antes da conclusão transacional",
        "auditoria": "evento da duplicação e RPC de auditoria persistem no schema canônico",
        "resultado": "aprovado",
    })
    evidence = ROOT / "docs/execucao/evidencias/duplicacao-pedido-atomica.json"
    if evidence.exists():
        previous = json.loads(evidence.read_text())
        if previous.get("verificacao_canonica"):
            result["producao_verificada"] = previous.get("producao_verificada", False)
            result["banco_canonico_de_construcao_verificado"] = previous.get(
                "banco_canonico_de_construcao_verificado", False
            )
            result["verificacao_canonica"] = previous["verificacao_canonica"]
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
