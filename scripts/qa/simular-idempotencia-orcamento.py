"""Valida retries, concorrência, hash completo e RLS do salvamento idempotente."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, subprocess, time, uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "quote-idempotency-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/quote-atomic-save-fixture.sql"
ATOMIC = ROOT / "supabase/migrations/20260927190000_atomic_quote_save.sql"
INITIAL = ROOT / "supabase/migrations/20260928162048_quote_save_idempotency.sql"
HARDENING = ROOT / "supabase/migrations/20260928173500_harden_quote_save_idempotency.sql"
SELLER = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

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

def actor(statement, actor_id=SELLER, *, check=True):
    return sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{actor_id}';\n{statement}\nRESET ROLE;",
        check=check,
    )

def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in {"SET", "RESET"}]
    return values[-1] if values else ""

def payload(quantity=2):
    items = [{
        "product_id": "produto-1", "product_name": "Caneca", "quantity": quantity,
        "unit_price": 10, "unit_cost": 6, "personalizations": [],
    }]
    subtotal = quantity * 12
    return ({
        "organization_id": ORG, "status": "draft", "client_name": "Cooperativa",
        "negotiation_markup_percent": 20, "discount_percent": 0, "discount_amount": 0,
        "shipping_type": "cif", "shipping_cost": 0, "subtotal": subtotal,
        "total": subtotal, "total_cost": quantity * 6,
    }, items)

def rpc(key, header, items, history, *, check=True):
    return actor(
        "SELECT public.save_quote_atomic_idempotent("
        f"$q${json.dumps(header, separators=(',', ':'))}$q$::jsonb,"
        f"$i${json.dumps(items, separators=(',', ':'))}$i$::jsonb,"
        f"'{key}'::uuid,$h${json.dumps(history)}$h$::jsonb)->>'id';",
        check=check,
    )

checks = {}
try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql("CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;")
    sql(FIXTURE.read_text())
    sql(f"CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('{SELLER}'),('{OTHER}');")
    sql(ATOMIC.read_text())
    sql(INITIAL.read_text())
    sql(HARDENING.read_text())
    sql(HARDENING.read_text())
    checks["hardening_reentrante"] = True

    header, items = payload()
    key = uuid.uuid4()
    first = scalar(rpc(key, header, items, ["Criado"]))
    retry = scalar(rpc(key, header, items, ["Criado"]))
    checks["retry_retorna_mesmo_orcamento"] = first == retry and scalar(sql("SELECT count(*) FROM quotes;")) == "1"

    changed_history = rpc(key, header, items, ["Histórico diferente"], check=False)
    checks["historico_participa_do_hash"] = changed_history.returncode != 0 and "conteúdo diferente" in changed_history.stderr

    concurrent_key = uuid.uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: scalar(rpc(concurrent_key, header, items, ["Concorrente"])), range(2)))
    checks["concorrencia_serializada"] = results[0] == results[1] and scalar(sql("SELECT count(*) FROM quotes;")) == "2"

    legacy_key = uuid.uuid4()
    legacy_hash = hashlib.md5((json.dumps(header, sort_keys=True, separators=(",", ":")) + ":" + json.dumps(items, sort_keys=True, separators=(",", ":"))).encode()).hexdigest()
    # jsonb::text usa espaços; o banco calcula o hash legado diretamente para evitar
    # que a serialização do Python faça parte do contrato do teste.
    sql(f"""
      INSERT INTO quote_save_idempotency(actor_id,idempotency_key,payload_hash,quote_id)
      SELECT '{SELLER}','{legacy_key}',md5($q${json.dumps(header)}$q$::jsonb::text || ':' || $i${json.dumps(items)}$i$::jsonb::text),'{first}';
    """)
    del legacy_hash
    checks["retry_md5_legado_preservado"] = scalar(rpc(legacy_key, header, items, ["Ignorado no hash legado"])) == first

    other_quote = uuid.uuid4()
    sql(f"INSERT INTO quotes(id,seller_id,organization_id,status) VALUES ('{other_quote}','{OTHER}','{ORG}','draft');")
    bola = actor(
        "INSERT INTO quote_save_idempotency(actor_id,idempotency_key,payload_hash,quote_id) "
        f"VALUES ('{SELLER}','{uuid.uuid4()}','{'0' * 64}','{other_quote}');",
        check=False,
    )
    checks["insert_direto_nao_aponta_quote_alheia"] = bola.returncode != 0
    checks["acl_sem_update_delete"] = scalar(sql(
        "SELECT has_table_privilege('authenticated','quote_save_idempotency','UPDATE')::text || '|' || "
        "has_table_privilege('authenticated','quote_save_idempotency','DELETE')::text;"
    )) == "false|false"

    assert all(checks.values()), checks
    print(json.dumps({"ambiente": "PostgreSQL 17 descartável sem rede", "remoto_validado": False, "cenarios": checks}, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
