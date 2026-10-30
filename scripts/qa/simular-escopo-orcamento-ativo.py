"""Prova que usuários inativos não gerenciam nem transicionam orçamentos."""
from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql"
CONTAINER = "quote-active-scope-" + uuid.uuid4().hex[:10]


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    result = command([
        "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
        "-XqAt", "-v", "ON_ERROR_STOP=1",
    ], stdin=statement, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result


def function_statement(source, name):
    start = source.index(f"CREATE OR REPLACE FUNCTION public.{name}(")
    body_end = source.index("$function$;", start) + len("$function$;")
    return source[start:body_end]


def scalar(statement):
    values = [line for line in sql(statement).stdout.splitlines() if line]
    if not values:
        raise RuntimeError("consulta sem resultado")
    return values[-1]


ACTIVE_BUYER = "11111111-1111-4111-8111-111111111111"
INACTIVE_BUYER = "22222222-2222-4222-8222-222222222222"
LEGACY_BUYER = "33333333-3333-4333-8333-333333333333"
INACTIVE_SELLER = "44444444-4444-4444-8444-444444444444"
MANAGER = "55555555-5555-4555-8555-555555555555"
SINGULAR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
QUOTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
SELLER_QUOTE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

result = {
    "ambiente": "PostgreSQL 17 descartável, sem rede e com dados sintéticos",
    "producao_verificada": False,
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
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE TYPE public.app_role AS ENUM (
        'admin','dev','manager','supervisor','vendedor','gestor_compras','comprador_singular'
      );
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY, user_id uuid UNIQUE NOT NULL, cooperativa_id uuid, pa_id uuid,
        role text, is_active boolean NOT NULL DEFAULT true, deleted_at timestamptz
      );
      CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL);
      CREATE TABLE public.organization_members (organization_id uuid NOT NULL, user_id uuid NOT NULL);
      CREATE TABLE public.quotes (
        id uuid PRIMARY KEY, seller_id uuid NOT NULL, organization_id uuid, pa_id uuid,
        singular_id uuid, status text NOT NULL, deleted_at timestamptz,
        is_latest_version boolean NOT NULL DEFAULT true
      );
      CREATE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
      AS $fn$ SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.user_id=_user_id OR p.id=_user_id)
          AND p.is_active IS TRUE AND p.deleted_at IS NULL
      ) $fn$;
      CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
      AS $fn$ SELECT public.sicoob_actor_is_active(_user_id) AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id=_user_id AND ur.role=_role
      ) $fn$;
      CREATE FUNCTION public.get_user_org_ids(_user_id uuid)
      RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
      AS $fn$ SELECT organization_id FROM public.organization_members WHERE user_id=_user_id $fn$;
      INSERT INTO public.profiles(id,user_id,cooperativa_id,role,is_active) VALUES
        ('{ACTIVE_BUYER}','{ACTIVE_BUYER}','{SINGULAR}','comprador_singular',true),
        ('{INACTIVE_BUYER}','{INACTIVE_BUYER}','{SINGULAR}','comprador_singular',false),
        ('{LEGACY_BUYER}','{LEGACY_BUYER}','{SINGULAR}','comprador_singular',true),
        ('{INACTIVE_SELLER}','{INACTIVE_SELLER}','{SINGULAR}','vendedor',false),
        ('{MANAGER}','{MANAGER}','{SINGULAR}','manager',true);
      INSERT INTO public.user_roles(user_id,role) VALUES
        ('{ACTIVE_BUYER}','comprador_singular'),
        ('{INACTIVE_BUYER}','comprador_singular'),
        ('{INACTIVE_SELLER}','vendedor'),
        ('{MANAGER}','manager');
      INSERT INTO public.quotes(id,seller_id,singular_id,status) VALUES
        ('{QUOTE}','{INACTIVE_SELLER}','{SINGULAR}','pending_singular_approval'),
        ('{SELLER_QUOTE}','{INACTIVE_SELLER}','{SINGULAR}','draft');
    """)

    migration = MIGRATION.read_text()
    sql(function_statement(migration, "can_manage_quote_scope"))
    sql(function_statement(migration, "assert_quote_transition"))
    sql("""
      REVOKE ALL ON FUNCTION public.assert_quote_transition(uuid,public.quotes,text)
        FROM PUBLIC,anon,authenticated,service_role;
      REVOKE ALL ON FUNCTION public.can_manage_quote_scope(uuid,uuid) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.can_manage_quote_scope(uuid,uuid) TO authenticated;
    """)

    assert scalar(f"SELECT public.can_manage_quote_scope('{ACTIVE_BUYER}','{QUOTE}')::text") == "true"
    assert scalar(f"SELECT public.can_manage_quote_scope('{INACTIVE_BUYER}','{QUOTE}')::text") == "false"
    assert scalar(f"SELECT public.can_manage_quote_scope('{LEGACY_BUYER}','{QUOTE}')::text") == "false"
    assert scalar(f"SELECT public.can_manage_quote_scope('{MANAGER}','{QUOTE}')::text") == "true"

    sql(f"SELECT public.assert_quote_transition('{ACTIVE_BUYER}',q,'approved_singular') FROM public.quotes q WHERE id='{QUOTE}'")
    inactive_buyer = sql(
        f"SELECT public.assert_quote_transition('{INACTIVE_BUYER}',q,'approved_singular') FROM public.quotes q WHERE id='{QUOTE}'",
        check=False,
    )
    inactive_seller = sql(
        f"SELECT public.assert_quote_transition('{INACTIVE_SELLER}',q,'pending') FROM public.quotes q WHERE id='{SELLER_QUOTE}'",
        check=False,
    )
    assert inactive_buyer.returncode != 0 and "não é permitida" in inactive_buyer.stderr
    assert inactive_seller.returncode != 0 and "não é permitida" in inactive_seller.stderr
    assert scalar("SELECT has_function_privilege('authenticated','public.assert_quote_transition(uuid,public.quotes,text)','EXECUTE')::text") == "false"

    result.update({
        "comprador_ativo": "autorizado na própria Singular",
        "comprador_inativo": "bloqueado",
        "papel_legado_sem_user_roles": "bloqueado",
        "vendedor_inativo": "bloqueado",
        "helper_interno": "sem EXECUTE para authenticated",
    })
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
