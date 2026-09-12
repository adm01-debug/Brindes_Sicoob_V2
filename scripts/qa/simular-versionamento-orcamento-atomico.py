"""Valida o versionamento de orçamento em PostgreSQL descartável e sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid

CONTAINER = "sicoob-versionamento-orcamento-" + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = [
    ROOT / "supabase/migrations/20260912100000_quote_versioning_atomic.sql",
    ROOT / "supabase/migrations/20260912130000_quote_versioning_family_roots.sql",
]
FIXTURE = ROOT / "tests/scenarios/sql/quote-versionamento-atomico-fixture.sql"
SELLER = "11111111-1111-1111-1111-111111111111"
OUTSIDER = "22222222-2222-2222-2222-222222222222"
SOURCE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SOURCE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
CHAIN_ROOT = "cccccccc-cccc-cccc-cccc-cccccccccccc"
CHAIN_MIDDLE = "dddddddd-dddd-dddd-dddd-dddddddddddd"
CHAIN_TIP = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
CHAIN_CHILD = "ffffffff-ffff-ffff-ffff-ffffffffffff"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=statement,
            check=False,
        )
        if response.returncode != 2:
            break
        time.sleep(0.5)

    if check and response.returncode != 0:
        raise RuntimeError(f"psql falhou com código {response.returncode}: {response.stderr.strip()}")
    return response


def actor_sql(actor, statement, *, check=True):
    return sql(f"SET request.jwt.claim.sub = '{actor}';\n{statement}", check=check)


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line != "SET"]
    if not values:
        raise RuntimeError("A consulta não retornou o valor esperado")
    return values[-1]


result = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migracoes": [str(migration.relative_to(ROOT)) for migration in MIGRATIONS],
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:16-alpine",
    ])
    for _ in range(120):
        if command(["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"], check=False).returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError("PostgreSQL descartável não iniciou")

    sql(FIXTURE.read_text())
    sql(f"""
      INSERT INTO public.quotes (
        id, quote_number, seller_id, client_name, total, version, parent_quote_id, is_latest_version
      ) VALUES
        ('{CHAIN_ROOT}', '90001/26', '{SELLER}', 'Cooperativa Cadeia', 10, 1, NULL, true),
        ('{CHAIN_MIDDLE}', '90002/26', '{SELLER}', 'Cooperativa Cadeia', 10, 2, '{CHAIN_ROOT}', true),
        ('{CHAIN_TIP}', '90003/26', '{SELLER}', 'Cooperativa Cadeia', 10, 3, '{CHAIN_MIDDLE}', true);
    """)
    for migration in MIGRATIONS:
        sql(migration.read_text())

    chain_after_migration = scalar(sql(f"""
      SELECT count(*) || '|'
        || count(*) FILTER (WHERE is_latest_version) || '|'
        || count(*) FILTER (WHERE id = '{CHAIN_ROOT}' AND parent_quote_id IS NULL) || '|'
        || count(*) FILTER (WHERE id <> '{CHAIN_ROOT}' AND parent_quote_id = '{CHAIN_ROOT}')
      FROM public.quotes
      WHERE id IN ('{CHAIN_ROOT}', '{CHAIN_MIDDLE}', '{CHAIN_TIP}');
    """))
    assert chain_after_migration == "3|1|1|2", chain_after_migration

    chain_new_quote_id = scalar(actor_sql(SELLER, f"SELECT public.create_quote_version_atomic('{CHAIN_TIP}');"))
    chain_copy = scalar(sql(f"""
      SELECT version || '|' || parent_quote_id::text
      FROM public.quotes WHERE id = '{chain_new_quote_id}';
    """))
    assert chain_copy == f"4|{CHAIN_ROOT}", chain_copy

    sql(f"""
      INSERT INTO public.quotes (
        id, quote_number, seller_id, client_name, total, version, parent_quote_id, is_latest_version
      ) VALUES ('{CHAIN_CHILD}', '90004/26', '{SELLER}', 'Cooperativa Cadeia', 10, 5, '{CHAIN_TIP}', false);
    """)
    assert scalar(sql(f"SELECT parent_quote_id::text FROM public.quotes WHERE id = '{CHAIN_CHILD}';")) == CHAIN_ROOT
    result["cadeia_historica"] = "cadeia multinível normalizada para a raiz; nova versão e inserção administrativa preservam o pai canônico"

    actor_sql(SELLER, f"""
      INSERT INTO public.quotes (
        id, quote_number, seller_id, client_name, status, subtotal, discount_percent,
        discount_amount, total, notes, payment_terms, delivery_time, shipping_type,
        shipping_cost, negotiation_markup_percent, real_subtotal, real_discount_percent, tags
      ) VALUES (
        '{SOURCE_A}', '10011/26', '{SELLER}', 'Cooperativa Teste', 'sent', 100, 10,
        10, 90, 'versão original', '30 dias', '15 dias', 'transportadora', 15, 5, 95,
        5.26, ARRAY['campanha']
      );
      SELECT setval('public.test_quote_number_sequence', 10011, true);
      WITH inserted_item AS (
        INSERT INTO public.quote_items (
          quote_id, product_id, product_name, product_sku, quantity, unit_price,
          unit_cost, subtotal, color_name, color_hex, sort_order, display_order, price_confirmed_at
        ) VALUES (
          '{SOURCE_A}', 'produto-1', 'Mochila Sicoob', 'MOCH-1', 12, 90, 40, 1146,
          'Verde', '#009C3B', 3, 3, now()
        ) RETURNING id
      )
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, positions_count,
        area_cm2, width_cm, height_cm, personalized_quantity, setup_cost, unit_cost,
        total_cost, notes
      )
      SELECT id, 'silk', 'Silk', 2, 1, 20, 5, 4, 12, 30, 3, 66, 'frente'
      FROM inserted_item;
    """)

    new_quote_id = scalar(actor_sql(SELLER, f"SELECT public.create_quote_version_atomic('{SOURCE_A}');"))
    copied = sql(f"""
      SELECT q.version || '|' || q.status || '|' || q.parent_quote_id::text || '|'
        || count(DISTINCT i.id) || '|' || count(DISTINCT p.id) || '|' || count(DISTINCT h.id)
        || '|' || coalesce(sum(i.subtotal), 0)
      FROM public.quotes q
      LEFT JOIN public.quote_items i ON i.quote_id = q.id
      LEFT JOIN public.quote_item_personalizations p ON p.quote_item_id = i.id
      LEFT JOIN public.quote_history h ON h.quote_id = q.id AND h.action = 'version_created'
      WHERE q.id = '{new_quote_id}'
      GROUP BY q.id;
    """).stdout.strip()
    assert copied == f"2|draft|{SOURCE_A}|1|1|1|1146", copied
    assert sql(f"""
      SELECT count(*) || '|' || count(*) FILTER (WHERE is_latest_version)
      FROM public.quotes
      WHERE id = '{SOURCE_A}' OR parent_quote_id = '{SOURCE_A}';
    """).stdout.strip() == "2|1"

    stale = actor_sql(SELLER, f"SELECT public.create_quote_version_atomic('{SOURCE_A}');", check=False)
    assert stale.returncode != 0 and "mais recente" in stale.stderr
    unauthorized = actor_sql(OUTSIDER, f"SELECT public.create_quote_version_atomic('{SOURCE_A}');", check=False)
    assert unauthorized.returncode != 0 and "não possui permissão" in unauthorized.stderr
    result["copia_e_autorizacao"] = {
        "nova_versao": "criada",
        "itens_personalizacoes_auditoria_e_subtotal": "1|1|1|1146",
        "versao_obsoleta": "bloqueada",
        "ator_sem_escopo": "bloqueado",
    }

    actor_sql(SELLER, f"""
      INSERT INTO public.quotes (id, quote_number, seller_id, client_name, subtotal, total)
      VALUES ('{SOURCE_B}', '10013/26', '{SELLER}', 'Cooperativa Falha', 50, 50);
      SELECT setval('public.test_quote_number_sequence', 10013, true);
      WITH inserted_item AS (
        INSERT INTO public.quote_items (quote_id, product_id, product_name, quantity, unit_price)
        VALUES ('{SOURCE_B}', 'produto-2', 'Copo Sicoob', 1, 50)
        RETURNING id
      )
      INSERT INTO public.quote_item_personalizations (quote_item_id, technique_id, total_cost)
      SELECT id, 'laser', 8 FROM inserted_item;

      CREATE FUNCTION public.test_fail_personalization_clone()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF current_setting('test.force_personalization_failure', true) = 'on' THEN
          RAISE EXCEPTION 'falha intencional de personalização';
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER test_fail_personalization_clone
      BEFORE INSERT ON public.quote_item_personalizations
      FOR EACH ROW EXECUTE FUNCTION public.test_fail_personalization_clone();
    """)

    rollback = actor_sql(SELLER, f"""
      DO $$
      BEGIN
        PERFORM set_config('test.force_personalization_failure', 'on', true);
        BEGIN
          PERFORM public.create_quote_version_atomic('{SOURCE_B}');
          RAISE EXCEPTION 'A falha deveria interromper a transação';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM <> 'falha intencional de personalização' THEN
            RAISE;
          END IF;
        END;
      END;
      $$;
    """, check=False)
    assert rollback.returncode == 0, rollback.stderr
    assert sql(f"""
      SELECT count(*) || '|' || count(*) FILTER (WHERE is_latest_version)
      FROM public.quotes
      WHERE id = '{SOURCE_B}' OR parent_quote_id = '{SOURCE_B}';
    """).stdout.strip() == "1|1"
    result["falha_intermediaria"] = "rollback preservou somente a origem vigente"

    concurrent = []
    for _ in range(2):
        process = subprocess.Popen(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        process.stdin.write(
            f"SET request.jwt.claim.sub = '{SELLER}';\n"
            f"SELECT public.create_quote_version_atomic('{SOURCE_B}');"
        )
        process.stdin.close()
        concurrent.append(process)

    statuses = []
    for process in concurrent:
        process.wait(timeout=20)
        statuses.append(process.returncode)
    assert sorted(statuses) == [0, 3], statuses
    assert sql(f"""
      SELECT count(*) || '|' || count(*) FILTER (WHERE is_latest_version)
      FROM public.quotes
      WHERE id = '{SOURCE_B}' OR parent_quote_id = '{SOURCE_B}';
    """).stdout.strip() == "2|1"
    result["concorrencia"] = {
        "retornos_psql": sorted(statuses),
        "familia_resultante": "2 versões, 1 vigente",
    }

    result["resultado"] = "aprovado"
    evidence = ROOT / "docs/execucao/evidencias/versionamento-orcamento-atomico.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
