"""Valida migration, privilégios e RLS da curadoria editorial em PostgreSQL 16."""
from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261013150000_catalog_marketing_taxonomy.sql"
CONTAINER = "sicoob-taxonomia-marketing-" + uuid.uuid4().hex[:10]
ADMIN = "11111111-1111-4111-8111-111111111111"
USER = "22222222-2222-4222-8222-222222222222"
INACTIVE = "33333333-3333-4333-8333-333333333333"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, check=True):
    result = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-XqAt", "-v", "ON_ERROR_STOP=1"],
        stdin=statement,
        check=False,
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result


def actor(statement, actor_id=USER, role="authenticated", check=True):
    return sql(f"SET ROLE {role}; SET request.jwt.claim.sub='{actor_id}'; {statement}", check)


checks = {}
try:
    command(["docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine"])
    wait_for_postgres(command, CONTAINER)
    sql(f"""
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TYPE public.app_role AS ENUM (
        'admin','manager','vendedor','supervisor','dev','gestor_compras',
        'gerente_pa','comprador_pac','comprador_singular'
      );
      CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL);
      CREATE TABLE public.actor_status(user_id uuid PRIMARY KEY, active boolean NOT NULL);
      CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS
        $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
      CREATE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS
        $$ SELECT EXISTS (SELECT 1 FROM public.actor_status WHERE user_id=_user_id AND active) $$;
      CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS
        $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
      INSERT INTO auth.users(id) VALUES ('{ADMIN}'),('{USER}'),('{INACTIVE}');
      INSERT INTO public.user_roles VALUES ('{ADMIN}','admin');
      INSERT INTO public.actor_status VALUES ('{ADMIN}',true),('{USER}',true),('{INACTIVE}',false);
    """)
    migration = MIGRATION.read_text()
    sql("BEGIN;" + migration + "ROLLBACK;")
    checks["dry_run_reverte"] = sql("SELECT to_regclass('public.catalog_marketing_terms') IS NULL;").stdout.strip() == "t"
    sql(migration)
    sql(migration)
    checks["migration_idempotente"] = sql("SELECT count(*)=30 FROM public.catalog_marketing_terms;").stdout.strip() == "t"
    checks["anon_sem_acesso"] = all(
        actor(f"SELECT count(*) FROM public.{relation};", role="anon", check=False).returncode != 0
        for relation in (
            "catalog_marketing_terms",
            "catalog_product_marketing",
            "catalog_marketing_term_usage",
        )
    )
    checks["usuario_ativo_le_vocabulario"] = actor("SELECT count(*)=30 FROM public.catalog_marketing_terms;").stdout.strip() == "t"
    checks["usuario_comum_nao_classifica"] = actor(
        "INSERT INTO public.catalog_product_marketing(product_id,term_id) SELECT 'produto-negado',id FROM public.catalog_marketing_terms LIMIT 1;",
        check=False,
    ).returncode != 0
    checks["ator_inativo_nao_le"] = actor("SELECT count(*) FROM public.catalog_marketing_terms;", actor_id=INACTIVE).stdout.strip() == "0"
    term_id = sql("SELECT id FROM public.catalog_marketing_terms WHERE category='publico_alvo' AND slug='produtor-rural';").stdout.strip()
    actor(f"INSERT INTO public.catalog_product_marketing(product_id,term_id) VALUES ('produto-1','{term_id}');", actor_id=ADMIN)
    checks["curador_classifica"] = actor(
        "SELECT product_count=1 FROM public.catalog_marketing_term_usage WHERE slug='produtor-rural';",
        actor_id=ADMIN,
    ).stdout.strip() == "t"
    checks["autor_registrado"] = sql(
        f"SELECT created_by='{ADMIN}' FROM public.catalog_product_marketing WHERE product_id='produto-1';"
    ).stdout.strip() == "t"
    checks["autor_forjado_negado"] = actor(
        f"INSERT INTO public.catalog_product_marketing(product_id,term_id,created_by) VALUES ('produto-2','{term_id}','{USER}');",
        actor_id=ADMIN,
        check=False,
    ).returncode != 0
    checks["vinculo_duplicado_negado"] = actor(
        f"INSERT INTO public.catalog_product_marketing(product_id,term_id) VALUES ('produto-1','{term_id}');",
        actor_id=ADMIN,
        check=False,
    ).returncode != 0
    checks["termo_inexistente_negado"] = actor(
        "INSERT INTO public.catalog_product_marketing(product_id,term_id) VALUES ('produto-3',gen_random_uuid());",
        actor_id=ADMIN,
        check=False,
    ).returncode != 0
    actor("DELETE FROM public.catalog_product_marketing WHERE product_id='produto-1';", actor_id=ADMIN)
    checks["curador_remove_classificacao"] = sql("SELECT count(*)=0 FROM public.catalog_product_marketing;").stdout.strip() == "t"
    checks["view_respeita_rls"] = actor(
        "SELECT count(*) FROM public.catalog_marketing_term_usage;",
        actor_id=INACTIVE,
    ).stdout.strip() == "0"
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)

failed = [name for name, passed in checks.items() if not passed]
print(json.dumps({"checks": checks, "total": len(checks), "failed": failed}, ensure_ascii=False, indent=2))
if failed:
    raise SystemExit(1)
