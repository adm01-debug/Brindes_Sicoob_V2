"""Valida o trigger e o isolamento RLS das preferências de notificação."""

from pathlib import Path
import subprocess
import uuid

from postgres_ready import wait_for_postgres


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260927194036_restore_notification_preferences.sql"
CONTAINER = "sicoob-notification-auth-" + uuid.uuid4().hex[:10]
USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"


def command(args, *, stdin=None, check=True):
    response = subprocess.run(args, input=stdin, text=True, capture_output=True, check=False)
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def sql(statement, *, check=True):
    return command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
        stdin=statement,
        check=check,
    )


try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "-e", "POSTGRES_PASSWORD=postgres", "--network", "none", "postgres:16-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql("""
      CREATE SCHEMA auth;
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN;
      CREATE ROLE supabase_auth_admin NOLOGIN;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    """)
    sql(MIGRATION.read_text())
    sql(f"INSERT INTO auth.users VALUES ('{USER_A}', 'qa-a@sicoob.test'), ('{USER_B}', 'qa-b@sicoob.test');")

    assertions = sql(f"""
      SELECT count(*) = 2 FROM public.notification_preferences;
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '{USER_A}';
      SELECT count(*) = 1 FROM public.notification_preferences;
      UPDATE public.notification_preferences SET email_enabled = false WHERE user_id = '{USER_B}';
      RESET ROLE;
      SELECT email_enabled IS TRUE FROM public.notification_preferences WHERE user_id = '{USER_B}';
      SELECT NOT has_function_privilege(
        'authenticated', 'public.create_default_notification_preferences()', 'execute'
      );
      SELECT has_function_privilege(
        'supabase_auth_admin', 'public.create_default_notification_preferences()', 'execute'
      );
      DELETE FROM auth.users WHERE id = '{USER_A}';
      SELECT count(*) = 0 FROM public.notification_preferences WHERE user_id = '{USER_A}';
    """).stdout.splitlines()
    relevant = [line for line in assertions if line not in {"SET", "RESET", "UPDATE 0", "DELETE 1"}]
    if relevant != ["t", "t", "t", "t", "t", "t"]:
        raise RuntimeError(f"Resultado inesperado: {assertions}")

    anonymous = sql("SET ROLE anon; SELECT count(*) FROM public.notification_preferences;", check=False)
    if anonymous.returncode == 0 or "permission denied" not in anonymous.stderr:
        raise RuntimeError("A função anônima obteve acesso indevido às preferências")

    print("Preferências de notificação: trigger, RLS, ACL e cascade aprovados.")
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
