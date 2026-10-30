"""Simula os chamadores SQL do webhook em PostgreSQL descartável e sem rede."""
from __future__ import annotations

import json
import subprocess
import uuid
from pathlib import Path

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261029213000_secure_webhook_dispatcher_callers.sql"
CONTAINER = "webhook-internal-auth-" + uuid.uuid4().hex[:10]
PROJECT_URL = "https://staging-sicoob.supabase.co"
SECRET = "s" * 48


def command(args: list[str], *, stdin: str | None = None, check: bool = True):
    result = subprocess.run(args, input=stdin, text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result


def sql(statement: str) -> subprocess.CompletedProcess[str]:
    return command([
        "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
        "-v", "ON_ERROR_STOP=1", "-At",
    ], stdin=statement)


def scalar(statement: str) -> str:
    values = [line for line in sql(statement).stdout.splitlines() if line]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


def dispatch_quote(quote_id: int) -> None:
    sql(f"""
      INSERT INTO public.quotes(id, quote_number, status, client_name, client_email, total, seller_id)
      VALUES ('00000000-0000-4000-8000-{quote_id:012d}', 'QA-{quote_id}', 'novo', 'Cooperativa QA', 'qa@example.test', 10, '00000000-0000-4000-8000-000000000001');
    """)


result = {
    "ambiente": "PostgreSQL 17 descartável (--network none), credenciais sintéticas",
    "migration": str(MIGRATION.relative_to(ROOT)),
    "banco_canonico_alterado": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql("""
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA vault;
      CREATE SCHEMA extensions;
      CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text, updated_at timestamptz DEFAULT now());
      CREATE TABLE public.webhook_dispatch_test_requests(
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        target_url text NOT NULL,
        headers jsonb NOT NULL,
        body jsonb NOT NULL
      );
      CREATE FUNCTION extensions.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer)
      RETURNS bigint LANGUAGE plpgsql AS $$
      DECLARE request_id bigint;
      BEGIN
        INSERT INTO public.webhook_dispatch_test_requests(target_url, headers, body)
        VALUES (url, headers, body) RETURNING id INTO request_id;
        RETURN request_id;
      END;
      $$;
      CREATE TABLE public.outbound_webhooks(
        id uuid PRIMARY KEY,
        active boolean NOT NULL,
        events text[] NOT NULL,
        retry_policy jsonb NOT NULL
      );
      CREATE TABLE public.webhook_deliveries(
        id uuid PRIMARY KEY,
        webhook_id uuid NOT NULL,
        event text NOT NULL,
        payload jsonb,
        payload_hash text NOT NULL,
        attempt integer NOT NULL,
        success boolean NOT NULL,
        delivered_at timestamptz NOT NULL
      );
      CREATE TABLE public.quotes(
        id uuid PRIMARY KEY,
        quote_number text NOT NULL,
        status text NOT NULL,
        client_name text,
        client_email text,
        total numeric NOT NULL,
        seller_id uuid NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.orders(
        id uuid PRIMARY KEY,
        order_number text NOT NULL,
        status text NOT NULL,
        client_name text,
        total numeric NOT NULL,
        seller_id uuid NOT NULL
      );
      CREATE TABLE public.discount_approval_requests(
        id uuid PRIMARY KEY,
        quote_id uuid NOT NULL,
        requested_discount_percent numeric NOT NULL,
        status text NOT NULL,
        seller_id uuid NOT NULL
      );
      CREATE TABLE public.kit_share_tokens(
        id uuid PRIMARY KEY,
        kit_id uuid NOT NULL,
        token text NOT NULL,
        client_name text,
        seller_id uuid NOT NULL
      );
    """)
    sql(MIGRATION.read_text(encoding="utf-8"))
    assert scalar("SELECT has_function_privilege('anon', 'public.retry_failed_webhook_deliveries()', 'EXECUTE');") == "f"
    assert scalar("SELECT has_function_privilege('authenticated', 'public.retry_failed_webhook_deliveries()', 'EXECUTE');") == "f"
    assert scalar("SELECT has_function_privilege('service_role', 'public.retry_failed_webhook_deliveries()', 'EXECUTE');") == "t"
    assert scalar("SELECT has_function_privilege('anon', 'public.dispatch_quote_webhook_event()', 'EXECUTE');") == "f"
    assert scalar("SELECT has_function_privilege('authenticated', 'public.dispatch_quote_webhook_event()', 'EXECUTE');") == "f"
    sql("""
      CREATE TRIGGER webhook_dispatch_test
      AFTER INSERT OR UPDATE ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();
      CREATE TRIGGER webhook_dispatch_orders
      AFTER INSERT OR UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();
      CREATE TRIGGER webhook_dispatch_discounts
      AFTER INSERT OR UPDATE ON public.discount_approval_requests
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();
      CREATE TRIGGER webhook_dispatch_kit_shares
      AFTER INSERT OR UPDATE ON public.kit_share_tokens
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();
      INSERT INTO public.outbound_webhooks(id, active, events, retry_policy)
      VALUES ('00000000-0000-4000-8000-000000000002', true,
        ARRAY['quote.created','quote.approved','order.created','discount.requested','discount.approved','kit.shared'],
        '{"max_attempts":3}');
    """)

    dispatch_quote(1)
    assert scalar("SELECT count(*) FROM public.webhook_dispatch_test_requests;") == "0", "trigger deve negar fail-closed sem Vault"

    sql(f"""
      INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES
        ('sicoob_project_url','{PROJECT_URL}'), ('webhook_dispatcher_secret','{SECRET}');
    """)
    dispatch_quote(2)
    assert scalar("SELECT count(*) FROM public.webhook_dispatch_test_requests;") == "1", "trigger deve chamar dispatcher com configuração válida"
    headers = json.loads(scalar("SELECT headers::text FROM public.webhook_dispatch_test_requests ORDER BY id DESC LIMIT 1;"))
    assert headers.get("x-sicoob-internal-secret") == SECRET, "trigger deve autenticar com segredo dedicado"
    assert "Authorization" not in headers, "trigger não deve transmitir service_role como bearer"

    sql("""
      UPDATE public.quotes SET status = 'approved'
      WHERE id = '00000000-0000-4000-8000-000000000002';
      INSERT INTO public.orders(id,order_number,status,client_name,total,seller_id) VALUES
        ('00000000-0000-4000-8000-000000000010','RE-QA-10','rascunho','Cooperativa QA',10,'00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-000000000011','PED-QA-11','novo','Cooperativa QA',10,'00000000-0000-4000-8000-000000000001');
      INSERT INTO public.discount_approval_requests(id,quote_id,requested_discount_percent,status,seller_id)
      VALUES ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000002',5,'pending','00000000-0000-4000-8000-000000000001');
      UPDATE public.discount_approval_requests SET status = 'approved'
      WHERE id = '00000000-0000-4000-8000-000000000020';
      INSERT INTO public.kit_share_tokens(id,kit_id,token,client_name,seller_id)
      VALUES ('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000031','token-qa','Cooperativa QA','00000000-0000-4000-8000-000000000001');
    """)
    events = json.loads(scalar("""
      SELECT jsonb_agg(body->>'event' ORDER BY id)::text
      FROM public.webhook_dispatch_test_requests;
    """))
    assert events == [
      "quote.created", "quote.approved", "order.created",
      "discount.requested", "discount.approved", "kit.shared",
    ], "migração deve preservar eventos e ignorar rascunho RE-*"

    sql("DELETE FROM vault.decrypted_secrets;")
    retry_without_secret = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_without_secret == {"ok": False, "error": "webhook_dispatcher_not_configured"}, "retry deve negar sem Vault"

    sql(f"""
      INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES
        ('sicoob_project_url','{PROJECT_URL}'), ('webhook_dispatcher_secret','{SECRET}');
      INSERT INTO public.outbound_webhooks(id, active, events, retry_policy)
      VALUES ('00000000-0000-4000-8000-000000000004', true, ARRAY['quote.created'], '{{"max_attempts":3}}');
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',
        'quote.created','{{"quote_id":"qa"}}','hash-old-qa',1,false,now() - interval '5 minutes');
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000002',
        'quote.created','{{"quote_id":"qa"}}','hash-qa',1,false,now());
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000004',
        'quote.created','{{"quote_id":"qa"}}','hash-qa',1,true,now());
    """)
    retry_ok = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_ok["ok"] is True and retry_ok["retried"] == 1, "retry deve preservar entrega com tentativas disponíveis"
    retry_headers = json.loads(scalar("SELECT headers::text FROM public.webhook_dispatch_test_requests ORDER BY id DESC LIMIT 1;"))
    retry_body = json.loads(scalar("SELECT body::text FROM public.webhook_dispatch_test_requests ORDER BY id DESC LIMIT 1;"))
    assert retry_headers.get("x-sicoob-internal-secret") == SECRET, "retry deve enviar o segredo dedicado"
    assert "Authorization" not in retry_headers, "retry não deve transmitir service_role como bearer"
    assert retry_body.get("target_webhook_id") == "00000000-0000-4000-8000-000000000002", "retry deve indicar somente o webhook que falhou"
    assert retry_body.get("retry_after_attempt") == 1, "retry deve preservar o contador de tentativas"

    sql("""
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',
        'quote.created','{}','hash-max',3,false,now());
    """)
    retry_max = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_max["ok"] is True and retry_max["retried"] == 1 and retry_max["skipped_max_attempts"] == 1
    assert scalar("SELECT count(*) FROM public.webhook_dispatch_test_requests;") == "8", "retry no limite não pode disparar outra chamada"

    result["resultado"] = "aprovado"
    result["casos"] = [
        "trigger sem segredo não envia",
        "trigger válido transmite só o segredo dedicado",
        "eventos de orçamento, pedido, desconto e kit são preservados; rascunho RE-* é ignorado",
        "retry sem segredo retorna bloqueio fechado",
        "retry válido respeita max_attempts",
        "retry identifica o hook falho e preserva o contador para evitar fan-out e tentativas infinitas",
        "nenhum chamador envia Authorization/service_role",
        "ACL permite retry só a postgres/service_role e nega anon/authenticated",
    ]
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
