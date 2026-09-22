"""Reproduz permissões e regressões em PostgreSQL sem rede, com limpeza final."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-auditoria-' + uuid.uuid4().hex[:10]
def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)
def sql(value, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','supabase_admin','-d','sicoob_simulation','-X','-qAt','-v','ON_ERROR_STOP=1'], stdin=value, check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result
def actor(role, uid, query, check=True):
    return sql(f"SET ROLE {role}; SET request.jwt.claim.role='{role}'; SET request.jwt.claim.sub='{uid}'; {query}", check)
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust',
        'public.ecr.aws/supabase/postgres:17.6.1.063','postgres','-D','/var/lib/postgresql/data'])
    wait_for_postgres(command, CONTAINER)
    command(['docker','exec',CONTAINER,'createdb','-U','supabase_admin','--template=template0','sicoob_simulation'])
    sql((ROOT/'tests/scenarios/sql/audit-controls-fixture.sql').read_text())
    old = (ROOT/'supabase/migrations/20260425212807_54b0bb33-1b1f-47d7-a5d3-4409ca43bf80.sql').read_text()
    sql(old[old.index('CREATE OR REPLACE VIEW public.v_full_scope_grants AS'):])
    migration = (ROOT/'supabase/migrations/20260922150000_reconcile_audit_controls.sql').read_text()
    sql('BEGIN;\n'+migration+'\nROLLBACK;')
    sql(migration)
    sql(migration)  # Reaplicação não muda o contrato.
    health = (ROOT/'supabase/migrations/20260922151000_migration_health_contract.sql').read_text()
    sql('BEGIN;\n'+health+'\nROLLBACK;')
    sql(health)
    sql(health)
    own='00000000-0000-0000-0000-000000000001'
    other='00000000-0000-0000-0000-000000000002'
    dev='00000000-0000-0000-0000-000000000003'
    checks={}
    checks['view_propria'] = actor('authenticated',own,"SELECT granted_to_name || '|' || granted_to_email FROM public.v_full_scope_grants;").stdout.strip() == 'Perfil próprio|proprio@example.invalid'
    checks['email_alheio_protegido'] = actor('authenticated',own,f"SELECT public.audit_actor_email('{other}') IS NULL;").stdout.strip() == 't'
    checks['dev_ve_duas_concessoes'] = actor('authenticated',dev,'SELECT count(*) FROM public.v_full_scope_grants;').stdout.strip() == '2'
    checks['servidor_le_view_sem_auth_users'] = actor('service_role','','SELECT count(*) FROM public.v_full_scope_grants;').stdout.strip() == '2'
    checks['anon_matriz_negado'] = actor('anon','','SELECT * FROM public.check_sicoob_access_matrix(\'admin\');',False).returncode != 0
    checks['comprador_auditoria_negado'] = actor('authenticated',own,'SELECT public.audit_rls_matrix();',False).returncode != 0
    checks['insert_nao_concede_select'] = actor('service_role','',"SELECT can_select::text || '|' || can_insert::text FROM public.check_sicoob_access_matrix('admin');").stdout.strip() == 'false|true'
    checks['pai_particionado_detectado'] = actor('service_role','',"SELECT relrowsecurity FROM public.check_tables_rls() WHERE relname='admin_audit_log';").stdout.strip() == 't'
    checks['matriz_particao_sem_falso_critico'] = actor('service_role','',"SELECT bool_and((x->>'rls_enabled')::boolean) FROM jsonb_array_elements(public.audit_rls_matrix()) x WHERE x->>'table'='admin_audit_log';").stdout.strip() == 't'
    checks['cobertura_particao'] = actor('service_role','',"SELECT x->>'rls_enabled' FROM jsonb_array_elements(public.audit_rls_coverage()) x WHERE x->>'table'='admin_audit_log';").stdout.strip() == 'true'
    checks['health_enum_real'] = actor('service_role','',"SELECT public.get_enum_values('app_role') @> ARRAY['gestor_compras','gerente_pa'];").stdout.strip() == 't'
    checks['health_rls_ausente'] = actor('service_role','',"SELECT rls_enabled FROM public.check_rls_enabled(ARRAY['tabela_ausente']);").stdout.strip() == 'f'
    checks['health_rls_particionada'] = actor('service_role','',"SELECT rls_enabled FROM public.check_rls_enabled(ARRAY['admin_audit_log']);").stdout.strip() == 't'
    checks['health_anon_negado'] = actor('anon','',"SELECT public.get_enum_values('app_role');",False).returncode != 0
    sql("CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text); INSERT INTO storage.buckets VALUES ('proposals');")
    preflight = (ROOT/'supabase/preflight/sicoob-reconciliation-contract.sql').read_text()
    output = sql(preflight).stdout
    checks['preflight_bucket_canonico'] = 'bucket|proposals|CONFORME' in output and 'art-files' not in output
    checks['preflight_assinatura_ausente'] = 'public.create_sicoob_kit_quote(jsonb,jsonb,jsonb,text,uuid,text)|FALTANTE' in output
    signature = 'public.create_sicoob_kit_quote(jsonb,jsonb,jsonb,text,uuid,text)'
    sql(f"CREATE FUNCTION {signature} RETURNS jsonb LANGUAGE sql AS $$ SELECT '{{}}'::jsonb $$; REVOKE ALL ON FUNCTION {signature} FROM PUBLIC, anon, authenticated, service_role;")
    checks['preflight_servidor_sem_acesso'] = signature + '|FALTANTE|servidor sem EXECUTE' in sql(preflight).stdout
    sql(f'GRANT EXECUTE ON FUNCTION {signature} TO service_role;')
    checks['preflight_rpc_servidor_conforme'] = signature + '|CONFORME|' in sql(preflight).stdout
    sql(f'GRANT EXECUTE ON FUNCTION {signature} TO authenticated;')
    checks['preflight_rpc_cliente_negado'] = signature + '|FALTANTE|execução indevida por cliente' in sql(preflight).stdout
    assert all(checks.values()), checks
    print(json.dumps({'ambiente':'PostgreSQL descartável sem rede', 'remoto_validado':False, 'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
