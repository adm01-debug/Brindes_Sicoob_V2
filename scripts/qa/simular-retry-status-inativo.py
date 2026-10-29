"""Reproduz e valida a autorização no retry idempotente de status.

A simulação usa PostgreSQL 17 descartável, isolado da rede e com dados sintéticos.
"""
from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / "supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql"
FIX = ROOT / "supabase/migrations/20261029102059_block_inactive_quote_status_retries.sql"
CONTAINER = "quote-status-retry-" + uuid.uuid4().hex[:10]

ACTIVE = "11111111-1111-4111-8111-111111111111"
INACTIVE = "22222222-2222-4222-8222-222222222222"
FOREIGN = "33333333-3333-4333-8333-333333333333"
OWN_QUOTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
FOREIGN_QUOTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
DELETED_QUOTE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"


def command(args, *, stdin=None, check=True):
    result = subprocess.run(args, input=stdin, text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result


def sql(statement, *, check=True):
    return command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-XqAt", "-v", "ON_ERROR_STOP=1"],
        stdin=statement,
        check=check,
    )


def function_statement(source, name):
    start = source.index(f"CREATE OR REPLACE FUNCTION public.{name}(")
    end = source.index("$function$;", start) + len("$function$;")
    return source[start:end]


def expect_denied(statement, marker):
    result = sql(statement, check=False)
    assert result.returncode != 0, f"esperava negação: {marker}"
    assert marker in result.stderr, result.stderr


result = {
    "ambiente": "PostgreSQL 17 descartável, sem rede e com dados sintéticos",
    "banco_canonico_alterado": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(f"""
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TYPE public.quote_status AS ENUM (
        'draft','pending','sent','approved','rejected','expired',
        'pending_singular_approval','approved_singular','rejected_singular'
      );
      CREATE TABLE public.profiles (
        user_id uuid PRIMARY KEY, is_active boolean NOT NULL, deleted_at timestamptz
      );
      CREATE TABLE public.quotes (
        id uuid PRIMARY KEY, seller_id uuid NOT NULL, organization_id uuid, pa_id uuid,
        singular_id uuid, status public.quote_status NOT NULL, row_version integer NOT NULL,
        rejection_notes text, approved_at timestamptz, approved_by uuid,
        deleted_at timestamptz, is_latest_version boolean DEFAULT true,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.quote_history (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, quote_id uuid NOT NULL,
        user_id uuid, action text NOT NULL, description text NOT NULL,
        field_changed text, old_value text, new_value text, metadata jsonb NOT NULL
      );
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE FUNCTION public.sicoob_actor_is_active(p_actor_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = p_actor_id AND p.is_active IS TRUE AND p.deleted_at IS NULL
        )
      $$;
      CREATE FUNCTION public.can_manage_quote_scope(p_actor_id uuid, p_quote_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
        SELECT false
      $$;
      CREATE FUNCTION public.assert_quote_transition(
        p_actor_id uuid, p_quote public.quotes, p_new_status text
      ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
      BEGIN
        IF p_quote.deleted_at IS NOT NULL OR COALESCE(p_quote.is_latest_version, true) IS NOT TRUE THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O orçamento não está disponível para transição.';
        END IF;
        IF p_quote.status::text = p_new_status THEN RETURN; END IF;
        IF public.sicoob_actor_is_active(p_actor_id) IS NOT TRUE THEN
          RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A transição de status não é permitida.';
        END IF;
      END $$;
      INSERT INTO public.profiles VALUES
        ('{ACTIVE}', true, NULL), ('{INACTIVE}', false, NULL), ('{FOREIGN}', true, NULL);
      INSERT INTO public.quotes (id,seller_id,status,row_version) VALUES
        ('{OWN_QUOTE}','{INACTIVE}','sent',7),
        ('{FOREIGN_QUOTE}','{FOREIGN}','draft',4),
        ('{DELETED_QUOTE}','{ACTIVE}','sent',9);
      UPDATE public.quotes SET deleted_at = now() WHERE id = '{DELETED_QUOTE}';
      GRANT USAGE ON SCHEMA public, auth TO authenticated;
      GRANT SELECT, UPDATE ON public.quotes TO authenticated;
      GRANT INSERT ON public.quote_history TO authenticated;
    """)

    legacy_sql = LEGACY.read_text(encoding="utf-8")
    sql(function_statement(legacy_sql, "bulk_update_quote_status_atomic"))
    sql(f"""
      ALTER FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)
        RENAME TO bulk_update_quote_status_atomic_core_20261013;
      CREATE FUNCTION public.bulk_update_quote_status_atomic(
        p_quote_ids uuid[], p_expected_row_versions integer[], p_status text, p_notes text DEFAULT NULL
      ) RETURNS TABLE(id uuid,status text,row_version integer)
      LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
      AS $$ SELECT * FROM public.bulk_update_quote_status_atomic_core_20261013($1,$2,$3,$4) $$;
      GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text) TO authenticated;
    """)

    vulnerable = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{INACTIVE}'; "
        f"SELECT id::text || '|' || status::text || '|' || row_version::text "
        f"FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid], ARRAY[2], 'sent', NULL);"
    )
    assert vulnerable.stdout.strip() == f"{OWN_QUOTE}|sent|7", vulnerable.stdout
    result["antes_da_migration"] = "confirmada exposição de id/status/versão a vendedor inativo no retry"

    sql(FIX.read_text(encoding="utf-8"))
    expect_denied(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{INACTIVE}'; "
        f"SELECT * FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid], ARRAY[2], 'sent', NULL);",
        "O ator não está autorizado",
    )
    result["vendedor_inativo"] = "negado antes de consultar o orçamento"
    expect_denied(
        f"SET ROLE authenticated; SET request.jwt.claim.sub=''; "
        f"SELECT * FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid], ARRAY[7], 'sent', NULL);",
        "O ator não está autorizado",
    )
    result["ator_ausente"] = "negado antes de consultar o orçamento"

    deleted_retry = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTIVE}'; "
        f"SELECT id::text || '|' || status::text || '|' || row_version::text "
        f"FROM public.bulk_update_quote_status_atomic(ARRAY['{DELETED_QUOTE}'::uuid], ARRAY[9], 'sent', NULL);",
        check=False,
    )
    assert deleted_retry.returncode != 0 and "não está disponível" in deleted_retry.stderr
    result["orçamento_excluído"] = "retry idempotente negado"

    foreign_read = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTIVE}'; "
        f"SELECT id::text || '|' || status::text || '|' || row_version::text "
        f"FROM public.bulk_update_quote_status_atomic(ARRAY['{FOREIGN_QUOTE}'::uuid], ARRAY[4], 'draft', NULL);",
        check=False,
    )
    # O ator não é dono da fixture; esta chamada deve ser negada pelo escopo.
    assert foreign_read.returncode != 0 and "não estão no seu escopo" in foreign_read.stderr
    result["fora_do_escopo"] = "negado sem revelar status/versão"

    sql(f"UPDATE public.quotes SET seller_id='{ACTIVE}' WHERE id='{OWN_QUOTE}';")
    no_op = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTIVE}'; "
        f"SELECT id::text || '|' || status::text || '|' || row_version::text "
        f"FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid], ARRAY[6], 'sent', NULL);"
    )
    assert no_op.stdout.strip() == f"{OWN_QUOTE}|sent|7", no_op.stdout
    assert sql(f"SELECT row_version::text || '|' || (SELECT count(*) FROM public.quote_history)::text FROM public.quotes WHERE id='{OWN_QUOTE}';").stdout.strip() == "7|0"
    result["retry_vendedor_ativo"] = "estado idempotente preservado sem versão/histórico adicionais"

    mixed = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTIVE}'; "
        f"SELECT * FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid,'{FOREIGN_QUOTE}'::uuid], ARRAY[7,4], 'pending', NULL);",
        check=False,
    )
    assert mixed.returncode != 0 and "não estão no seu escopo" in mixed.stderr
    state = sql(
        f"SELECT string_agg(status::text || ':' || row_version::text, ',' ORDER BY id) "
        f"FROM public.quotes WHERE id IN ('{OWN_QUOTE}','{FOREIGN_QUOTE}');"
    ).stdout.strip()
    assert state == "sent:7,draft:4", state
    result["lote_misto"] = "falha sem atualização parcial; status/versões preservados"

    sql(f"UPDATE public.quotes SET seller_id='{ACTIVE}' WHERE id='{FOREIGN_QUOTE}';")
    version_conflict = sql(
        f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTIVE}'; "
        f"SELECT * FROM public.bulk_update_quote_status_atomic(ARRAY['{OWN_QUOTE}'::uuid,'{FOREIGN_QUOTE}'::uuid], ARRAY[7,999], 'pending', NULL);",
        check=False,
    )
    assert version_conflict.returncode != 0 and "foram modificados" in version_conflict.stderr
    state = sql(
        f"SELECT string_agg(status::text || ':' || row_version::text, ',' ORDER BY id) "
        f"FROM public.quotes WHERE id IN ('{OWN_QUOTE}','{FOREIGN_QUOTE}');"
    ).stdout.strip()
    assert state == "sent:7,draft:4", state
    result["versão_divergente"] = "lote inteiro rejeitado sem escrita parcial"

    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
