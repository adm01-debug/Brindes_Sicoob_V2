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
      CREATE SCHEMA net;
      CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text, updated_at timestamptz DEFAULT now());
      CREATE TABLE public.webhook_dispatch_test_requests(
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        target_url text NOT NULL,
        headers jsonb NOT NULL,
        body jsonb NOT NULL
      );
      CREATE FUNCTION extensions.http_post(url text, body text, params jsonb, headers jsonb, timeout_milliseconds integer)
      RETURNS bigint LANGUAGE plpgsql AS $$
      DECLARE request_id bigint;
      BEGIN
        INSERT INTO public.webhook_dispatch_test_requests(target_url, headers, body)
        VALUES (url, headers, body::jsonb) RETURNING id INTO request_id;
        RETURN request_id;
      END;
      $$;
      CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb)
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
    """)
    sql(MIGRATION.read_text(encoding="utf-8"))
    sql("""
      CREATE TRIGGER webhook_dispatch_test
      AFTER INSERT ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();
      INSERT INTO public.outbound_webhooks(id, active, events, retry_policy)
      VALUES ('00000000-0000-4000-8000-000000000002', true, ARRAY['quote.created'], '{"max_attempts":3}');
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

    sql("DELETE FROM vault.decrypted_secrets;")
    retry_without_secret = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_without_secret == {"ok": False, "error": "webhook_dispatcher_not_configured"}, "retry deve negar sem Vault"

    sql(f"""
      INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES
        ('sicoob_project_url','{PROJECT_URL}'), ('webhook_dispatcher_secret','{SECRET}');
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',
        'quote.created','{{"quote_id":"qa"}}','hash-qa',1,false,now());
    """)
    retry_ok = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_ok["ok"] is True and retry_ok["retried"] == 1, "retry deve preservar entrega com tentativas disponíveis"
    retry_headers = json.loads(scalar("SELECT headers::text FROM public.webhook_dispatch_test_requests ORDER BY id DESC LIMIT 1;"))
    assert retry_headers.get("x-sicoob-internal-secret") == SECRET, "retry deve enviar o segredo dedicado"
    assert "Authorization" not in retry_headers, "retry não deve transmitir service_role como bearer"

    sql("""
      INSERT INTO public.webhook_deliveries(id,webhook_id,event,payload,payload_hash,attempt,success,delivered_at)
      VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',
        'quote.created','{}','hash-max',3,false,now());
    """)
    retry_max = json.loads(scalar("SELECT public.retry_failed_webhook_deliveries()::text;"))
    assert retry_max["ok"] is True and retry_max["retried"] == 1 and retry_max["skipped_max_attempts"] == 1
    assert scalar("SELECT count(*) FROM public.webhook_dispatch_test_requests;") == "3", "retry no limite não pode disparar outra chamada"

    result["resultado"] = "aprovado"
    result["casos"] = [
        "trigger sem segredo não envia",
        "trigger válido transmite só o segredo dedicado",
        "retry sem segredo retorna bloqueio fechado",
        "retry válido respeita max_attempts",
        "nenhum chamador envia Authorization/service_role",
    ]
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
