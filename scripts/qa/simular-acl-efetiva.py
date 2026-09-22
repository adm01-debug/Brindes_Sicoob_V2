"""Simula o gate ACL em PostgreSQL isolado, sem rede e sem dados de clientes."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-acl-' + uuid.uuid4().hex[:10]
def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)
def sql(value, check=True):
    result = command(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'supabase_admin', '-d', 'sicoob_simulation', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], stdin=value, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def count(where):
    return int(sql('SELECT count(*) FROM public.audit_security_definer_acl() WHERE ' + where).stdout.strip())

try:
    command(['docker', 'run', '--rm', '-d', '--name', CONTAINER, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'public.ecr.aws/supabase/postgres:17.6.1.063', 'postgres', '-D', '/var/lib/postgresql/data'])
    wait_for_postgres(command, CONTAINER)
    command(['docker', 'exec', CONTAINER, 'createdb', '-U', 'supabase_admin', '--template=template0', 'sicoob_simulation'])
    sql("CREATE TYPE public.app_role AS ENUM ('dev'); CREATE ROLE acl_fixture_owner; CREATE ROLE acl_fixture_group; GRANT USAGE, CREATE ON SCHEMA public TO acl_fixture_owner;")
    migration = (ROOT / 'supabase/migrations/20260922190000_audit_effective_function_acl.sql').read_text()
    sql('BEGIN;\n' + migration + '\nROLLBACK;')
    checks = {'dry_run_sem_persistencia': sql("SELECT to_regprocedure('public.audit_security_definer_acl()') IS NULL;").stdout.strip() == 't'}
    sql(migration)
    sql(migration)
    # Novo dono sem ALTER DEFAULT PRIVILEGES, para reproduzir proacl IS NULL.
    sql("SET ROLE acl_fixture_owner; CREATE FUNCTION public.acl_default_fixture() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'; RESET ROLE;")
    checks['fixture_acl_nula'] = sql("SELECT proacl IS NULL FROM pg_proc WHERE oid='public.acl_default_fixture()'::regprocedure;").stdout.strip() == 't'
    checks['public_padrao_detectado'] = count("function_name='acl_default_fixture' AND granted_to='PUBLIC'") == 1
    checks['anon_padrao_detectado'] = count("function_name='acl_default_fixture' AND granted_to='anon'") == 1
    sql("REVOKE EXECUTE ON FUNCTION public.acl_default_fixture() FROM PUBLIC;")
    checks['revogacao_elimina_achado'] = count("function_name='acl_default_fixture'") == 0
    sql("GRANT acl_fixture_group TO anon; GRANT EXECUTE ON FUNCTION public.acl_default_fixture() TO acl_fixture_group;")
    checks['heranca_anon_detectada'] = count("function_name='acl_default_fixture' AND granted_to='anon'") == 1
    sql("CREATE FUNCTION public.can_manage(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT false'; CREATE FUNCTION public.can_manage(integer) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT false'; REVOKE ALL ON FUNCTION public.can_manage(uuid), public.can_manage(integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.can_manage(uuid), public.can_manage(integer) TO anon;")
    checks['assinatura_revisada_aceita'] = count("function_name='can_manage' AND arguments='uuid' AND granted_to='anon'") == 0
    checks['sobrecarga_nao_herda_excecao'] = count("function_name='can_manage' AND arguments='integer' AND granted_to='anon'") == 1
    sql("CREATE FUNCTION public.acl_trigger_fixture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS 'BEGIN RETURN NEW; END'; REVOKE ALL ON FUNCTION public.acl_trigger_fixture() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.acl_trigger_fixture() TO acl_fixture_group; GRANT acl_fixture_group TO authenticated;")
    checks['heranca_authenticated_trigger_detectada'] = count("function_name='acl_trigger_fixture' AND granted_to='authenticated'") == 1
    checks['anon_nao_chama_gate'] = sql('SET ROLE anon; SELECT * FROM public.audit_security_definer_acl();', False).returncode != 0
    checks['service_chama_gate'] = sql('SET ROLE service_role; SELECT * FROM public.audit_security_definer_acl();', False).returncode == 0
    assert all(checks.values()), checks
    print(json.dumps({'ambiente': 'PostgreSQL descartável sem rede', 'remoto_validado': False, 'cenarios': checks}, ensure_ascii=False, indent=2))
finally:
    command(['docker', 'rm', '-f', CONTAINER], check=False)
