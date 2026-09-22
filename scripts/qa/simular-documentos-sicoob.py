"""Valida vínculo e limpeza de documentos Sicoob sem rede ou arquivos reais."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT=Path(__file__).resolve().parents[2]
CONTAINER='sicoob-docs-'+uuid.uuid4().hex[:10]
MIGRATION=ROOT/'supabase/migrations/20260922224700_validate_sicoob_order_documents.sql'
ACTOR='11111111-1111-4111-8111-111111111111'
ORDER='22222222-2222-4222-8222-222222222222'

def command(args,*,stdin=None,check=True): return subprocess.run(args,input=stdin,text=True,capture_output=True,check=check)
def sql(statement,check=True):
    result=command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=statement,check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result
def scalar(statement): return sql(statement).stdout.strip()
def as_actor(statement,check=True): return sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTOR}'; {statement}",check)

checks={}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command,CONTAINER)
    sql(f"""
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE SCHEMA storage;
      CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb,UNIQUE(bucket_id,name));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage,public TO authenticated; GRANT SELECT,DELETE ON storage.objects TO authenticated;
      CREATE POLICY storage_fixture_read ON storage.objects FOR SELECT TO authenticated USING (owner=auth.uid());
      CREATE FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT auth.uid() IS NOT NULL$$;
      REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) TO authenticated;
      CREATE TABLE public.sicoob_order_invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,invoice_number text,file_type text,file_path text,created_by uuid);
      CREATE TABLE public.sicoob_order_shipments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,delivery_photo_path text,created_by uuid);
      GRANT SELECT ON public.sicoob_order_invoices, public.sicoob_order_shipments TO authenticated;
    """)
    migration=MIGRATION.read_text(); sql('BEGIN;\n'+migration+'\nROLLBACK;'); sql(migration)
    missing=sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','1','pdf','{ORDER}/invoices/missing.pdf','{ACTOR}');",False)
    checks['nota_sem_objeto_bloqueada']=missing.returncode!=0
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/invoices/ok.pdf','{ACTOR}','{{\"mimetype\":\"application/pdf\",\"size\":1024}}');")
    sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','1','pdf','{ORDER}/invoices/ok.pdf','{ACTOR}');")
    checks['nota_valida_vinculada']=scalar('SELECT count(*) FROM public.sicoob_order_invoices;')=='1'
    as_actor(f"DELETE FROM storage.objects WHERE name='{ORDER}/invoices/ok.pdf';")
    checks['nota_vinculada_nao_pode_ser_apagada']=scalar(f"SELECT count(*) FROM storage.objects WHERE name='{ORDER}/invoices/ok.pdf';")=='1'
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/invoices/forged.pdf','{ACTOR}','{{\"mimetype\":\"text/plain\",\"size\":10}}');")
    forged=sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','2','pdf','{ORDER}/invoices/forged.pdf','{ACTOR}');",False)
    checks['mime_forjado_bloqueado']=forged.returncode!=0
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/delivery/proof.webp','{ACTOR}','{{\"mimetype\":\"image/webp\",\"size\":2048}}');")
    sql(f"INSERT INTO public.sicoob_order_shipments(order_id,delivery_photo_path,created_by) VALUES ('{ORDER}','{ORDER}/delivery/proof.webp','{ACTOR}');")
    checks['comprovante_valido_vinculado']=scalar('SELECT count(*) FROM public.sicoob_order_shipments;')=='1'
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/delivery/orphan.webp','{ACTOR}','{{\"mimetype\":\"image/webp\",\"size\":2048}}');")
    as_actor(f"DELETE FROM storage.objects WHERE name='{ORDER}/delivery/orphan.webp';")
    checks['comprovante_orfao_removivel']=scalar(f"SELECT count(*) FROM storage.objects WHERE name='{ORDER}/delivery/orphan.webp';")=='0'
    as_actor(f"DELETE FROM storage.objects WHERE name='{ORDER}/delivery/proof.webp';")
    checks['comprovante_vinculado_preservado']=scalar(f"SELECT count(*) FROM storage.objects WHERE name='{ORDER}/delivery/proof.webp';")=='1'
    checks['trigger_privado']=scalar("SELECT has_function_privilege('authenticated','public.validate_sicoob_order_document()','EXECUTE')::text||'|'||has_function_privilege('anon','public.validate_sicoob_order_document()','EXECUTE')::text;")=='false|false'
    assert all(checks.values()),checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
