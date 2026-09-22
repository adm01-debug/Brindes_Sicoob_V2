"""Consolidação atômica de orçamentos em PostgreSQL descartável."""
from pathlib import Path
import json, subprocess, uuid
from postgres_ready import wait_for_postgres
ROOT=Path(__file__).resolve().parents[2]; CONTAINER='sicoob-quote-cons-'+uuid.uuid4().hex[:10]
MIGRATION=ROOT/'supabase/migrations/20260922224800_consolidate_quotes_atomic.sql'
ACTOR='11111111-1111-4111-8111-111111111111'; OUT='11111111-1111-4111-8111-111111111112'; SING='22222222-2222-4222-8222-222222222222'; OTHER='22222222-2222-4222-8222-222222222223'
def command(args,*,stdin=None,check=True): return subprocess.run(args,input=stdin,text=True,capture_output=True,check=check)
def sql(s,check=True):
 r=command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=s,check=False)
 if check and r.returncode: raise RuntimeError(r.stderr)
 return r
def scalar(s): return sql(s).stdout.strip()
def actor(s,who=ACTOR,check=True): return sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{who}'; {s}",check)
checks={}
try:
 command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine']); wait_for_postgres(command,CONTAINER)
 sql(f"""
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE profiles(id uuid,user_id uuid,role text,cooperativa_id uuid);
 CREATE TABLE quote_consolidations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),consolidated_by uuid,singular_id uuid,status text,notes text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE quotes(id uuid PRIMARY KEY,singular_id uuid,status text,consolidation_id uuid,updated_at timestamptz DEFAULT now());
 INSERT INTO profiles VALUES ('{ACTOR}','{ACTOR}','gestor_compras','{SING}'),('{OUT}','{OUT}','gestor_compras','{OTHER}');
 """)
 migration=MIGRATION.read_text(); sql('BEGIN;\n'+migration+'\nROLLBACK;'); sql(migration)
 q1='33333333-3333-4333-8333-333333333331'; q2='33333333-3333-4333-8333-333333333332'
 sql(f"INSERT INTO quotes(id,singular_id,status) VALUES ('{q1}','{SING}','approved_singular'),('{q2}','{SING}','approved_singular');")
 result=actor(f"SELECT public.consolidate_sicoob_quotes('{SING}',ARRAY['{q1}'::uuid,'{q2}'::uuid],'Lote QA')->>'id';").stdout.strip()
 checks['consolidacao_e_vinculos_atomicos']=bool(result) and scalar(f"SELECT count(*) FROM quotes WHERE consolidation_id='{result}';")=='2'
 second=actor(f"SELECT public.consolidate_sicoob_quotes('{SING}',ARRAY['{q1}'::uuid],'repetida');",check=False)
 checks['nao_reconsolida_orcamento']=second.returncode!=0 and scalar('SELECT count(*) FROM quote_consolidations;')=='1'
 q3='33333333-3333-4333-8333-333333333333'; sql(f"INSERT INTO quotes VALUES ('{q3}','{SING}','approved_singular',NULL,now());")
 denied=actor(f"SELECT public.consolidate_sicoob_quotes('{SING}',ARRAY['{q3}'::uuid],NULL);",OUT,False)
 checks['ator_fora_da_singular_bloqueado']=denied.returncode!=0 and scalar(f"SELECT consolidation_id IS NULL FROM quotes WHERE id='{q3}';")=='t'
 missing='33333333-3333-4333-8333-333333333339'
 partial=actor(f"SELECT public.consolidate_sicoob_quotes('{SING}',ARRAY['{q3}'::uuid,'{missing}'::uuid],NULL);",check=False)
 checks['lista_parcial_reverte_tudo']=partial.returncode!=0 and scalar(f"SELECT consolidation_id IS NULL FROM quotes WHERE id='{q3}';")=='t' and scalar('SELECT count(*) FROM quote_consolidations;')=='1'
 checks['acl_authenticated_sem_anon']=scalar("SELECT has_function_privilege('authenticated','public.consolidate_sicoob_quotes(uuid,uuid[],text)','EXECUTE')::text||'|'||has_function_privilege('anon','public.consolidate_sicoob_quotes(uuid,uuid[],text)','EXECUTE')::text;")=='true|false'
 assert all(checks.values()),checks
 print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally: command(['docker','rm','-f',CONTAINER],check=False)
