"""Valida vínculo e limpeza de documentos Sicoob sem rede ou arquivos reais."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT=Path(__file__).resolve().parents[2]
CONTAINER='sicoob-docs-'+uuid.uuid4().hex[:10]
MIGRATION=ROOT/'supabase/migrations/20260922224700_validate_sicoob_order_documents.sql'
INTEGRITY=ROOT/'supabase/migrations/20260922225400_sicoob_operational_integrity.sql'
GATE=ROOT/'supabase/migrations/20260922225600_sicoob_document_quarantine_gate.sql'
ACTOR='11111111-1111-4111-8111-111111111111'
ORDER='22222222-2222-4222-8222-222222222222'

def command(args,*,stdin=None,check=True): return subprocess.run(args,input=stdin,text=True,capture_output=True,check=check)
def sql(statement,check=True):
    result=command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=statement,check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result
def scalar(statement): return sql(statement).stdout.strip()
def as_actor(statement,check=True): return sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTOR}'; {statement}",check)
def register(document_id,purpose,final_path,mime,size=1024,actor=ACTOR):
    quarantine=f'{actor}/{ORDER}/{purpose}/{document_id}'
    return sql(f"""
      INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES
        ('sicoob-document-quarantine','{quarantine}',NULL,'{{"mimetype":"{mime}","size":{size}}}'),
        ('sicoob-order-documents','{final_path}',NULL,'{{"mimetype":"{mime}","size":{size}}}')
      ON CONFLICT(bucket_id,name) DO NOTHING;
      SET ROLE service_role; SET request.jwt.claim.role='service_role';
      SELECT public.register_sicoob_clean_document(
        '{document_id}','{actor}','{ORDER}','{purpose}','{quarantine}','{final_path}',
        '{'a'*64}','{mime}',{size},'scanner-sintetico','1','{{"clean":true,"engine":"scanner-sintetico"}}'
      );
      RESET ROLE;
    """,False)

checks={}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command,CONTAINER)
    sql(f"""
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('{ACTOR}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT jsonb_build_object('role',current_setting('request.jwt.claim.role',true))$$;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
      CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb,UNIQUE(bucket_id,name));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA auth,storage,public TO authenticated,service_role; GRANT SELECT,DELETE ON storage.objects TO authenticated;
      CREATE POLICY storage_fixture_read ON storage.objects FOR SELECT TO authenticated USING (owner=auth.uid());
      CREATE FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT auth.uid() IS NOT NULL$$;
      CREATE FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT true$$;
      REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) TO authenticated;
      CREATE TABLE public.sicoob_orders(id uuid PRIMARY KEY,requires_artwork boolean DEFAULT false,updated_at timestamptz DEFAULT now());
      CREATE TABLE public.sicoob_order_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,personalization_snapshot jsonb);
      ALTER TABLE public.sicoob_order_items ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Creators can insert items to their own draft orders" ON public.sicoob_order_items FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Creators can delete items from their own draft orders" ON public.sicoob_order_items FOR DELETE TO authenticated USING (true);
      INSERT INTO public.sicoob_orders(id) VALUES ('{ORDER}');
      CREATE TABLE public.sicoob_order_invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,invoice_number text,file_type text,file_path text,created_by uuid);
      CREATE TABLE public.sicoob_order_shipments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid UNIQUE,delivery_photo_path text,created_by uuid);
      GRANT SELECT ON public.sicoob_order_invoices, public.sicoob_order_shipments TO authenticated;
    """)
    migration=MIGRATION.read_text(); integrity=INTEGRITY.read_text(); gate=GATE.read_text()
    sql('BEGIN;\n'+migration+'\n'+integrity+'\n'+gate+'\nROLLBACK;'); sql(migration); sql(integrity); sql(gate)
    missing=sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','1','pdf','{ORDER}/invoices/missing.pdf','{ACTOR}');",False)
    checks['nota_sem_objeto_bloqueada']=missing.returncode!=0
    doc_invoice='33333333-3333-4333-8333-333333333331'
    invoice_path=f'{ORDER}/invoices/{doc_invoice}.pdf'
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{invoice_path}',NULL,'{{\"mimetype\":\"application/pdf\",\"size\":1024}}');")
    checks['registro_limpo_exige_service_role']=register(doc_invoice,'invoice_pdf',invoice_path,'application/pdf').returncode==0
    sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','1','pdf','{invoice_path}','{ACTOR}');")
    checks['nota_valida_vinculada']=scalar('SELECT count(*) FROM public.sicoob_order_invoices;')=='1'
    checks['nota_recebe_identidade_verificada']=scalar('SELECT document_id::text FROM public.sicoob_order_invoices;')==doc_invoice
    reused=sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','2','pdf','{invoice_path}','{ACTOR}');",False)
    checks['documento_nao_pode_ser_reutilizado']=reused.returncode!=0
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/invoices/forged.pdf','{ACTOR}','{{\"mimetype\":\"text/plain\",\"size\":10}}');")
    forged=sql(f"INSERT INTO public.sicoob_order_invoices(order_id,invoice_number,file_type,file_path,created_by) VALUES ('{ORDER}','2','pdf','{ORDER}/invoices/forged.pdf','{ACTOR}');",False)
    checks['metadata_forjada_sem_registro_limpo_bloqueada']=forged.returncode!=0
    doc_delivery='33333333-3333-4333-8333-333333333332'; delivery_path=f'{ORDER}/delivery/{doc_delivery}.webp'
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{delivery_path}',NULL,'{{\"mimetype\":\"image/webp\",\"size\":2048}}');")
    checks['comprovante_registrado_por_scanner']=register(doc_delivery,'delivery_proof',delivery_path,'image/webp',2048).returncode==0
    sql(f"INSERT INTO public.sicoob_order_shipments(order_id,delivery_photo_path,created_by) VALUES ('{ORDER}','{delivery_path}','{ACTOR}');")
    checks['comprovante_valido_vinculado']=scalar('SELECT count(*) FROM public.sicoob_order_shipments;')=='1'
    checks['proprietario_do_comprovante_materializado']=scalar('SELECT delivery_photo_uploaded_by::text FROM public.sicoob_order_shipments;')==ACTOR
    shipment_id=scalar('SELECT id FROM public.sicoob_order_shipments;')
    doc_delivery_2='33333333-3333-4333-8333-333333333333'; delivery_path_2=f'{ORDER}/delivery/{doc_delivery_2}.png'
    checks['novo_comprovante_registrado']=register(doc_delivery_2,'delivery_proof',delivery_path_2,'image/png',2048).returncode==0
    sql(f"INSERT INTO public.sicoob_order_shipments(order_id,delivery_photo_path,created_by) VALUES ('{ORDER}','{delivery_path_2}','{ACTOR}') ON CONFLICT(order_id) DO UPDATE SET delivery_photo_path=EXCLUDED.delivery_photo_path;")
    checks['upsert_vincula_comprovante_ao_registro_existente']=scalar("SELECT id::text||'|'||delivery_document_id::text FROM public.sicoob_order_shipments;")==f'{shipment_id}|{doc_delivery_2}'
    sql(f"UPDATE public.sicoob_order_shipments SET delivery_document_id='{doc_invoice}' WHERE order_id='{ORDER}';")
    checks['identidade_do_comprovante_nao_pode_ser_adulterada']=scalar('SELECT delivery_document_id::text FROM public.sicoob_order_shipments;')==doc_delivery_2
    checks['escrita_direta_de_item_revogada']=scalar("SELECT count(*)=0 FROM pg_policies WHERE schemaname='public' AND tablename='sicoob_order_items' AND policyname IN ('Creators can insert items to their own draft orders','Creators can delete items from their own draft orders');")=='t'
    sql(f"INSERT INTO storage.objects(bucket_id,name,owner,metadata) VALUES ('sicoob-order-documents','{ORDER}/delivery/orphan.webp','{ACTOR}','{{\"mimetype\":\"image/webp\",\"size\":2048}}');")
    as_actor(f"DELETE FROM storage.objects WHERE name='{ORDER}/delivery/orphan.webp';")
    checks['comprovante_orfao_removivel']=scalar(f"SELECT count(*) FROM storage.objects WHERE name='{ORDER}/delivery/orphan.webp';")=='0'
    checks['comprovante_recebe_identidade_verificada']=scalar('SELECT delivery_document_id::text FROM public.sicoob_order_shipments;')==doc_delivery_2
    sql(f"UPDATE public.sicoob_order_shipments SET delivery_photo_path=NULL WHERE order_id='{ORDER}';")
    checks['remocao_do_caminho_elimina_identidade_pendente']=scalar("SELECT (delivery_document_id IS NULL)::text||'|'||(delivery_photo_uploaded_by IS NULL)::text FROM public.sicoob_order_shipments;")=='true|true'
    checks['uploads_diretos_finais_revogados']=scalar("SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname IN ('sicoob_order_documents_upload_invoice','sicoob_order_documents_upload_by_authorized_actor');")=='0'
    checks['quarentena_privada']=scalar("SELECT public::text||'|'||file_size_limit::text FROM storage.buckets WHERE id='sicoob-document-quarantine';")=='false|10485760'
    checks['registro_nao_exposto_para_escrita']=scalar("SELECT has_table_privilege('authenticated','public.sicoob_document_registry','INSERT')::text||'|'||has_function_privilege('authenticated','public.register_sicoob_clean_document(uuid,uuid,uuid,text,text,text,text,text,bigint,text,text,jsonb)','EXECUTE')::text;")=='false|false'
    checks['trigger_privado']=scalar("SELECT has_function_privilege('authenticated','public.validate_sicoob_order_document()','EXECUTE')::text||'|'||has_function_privilege('anon','public.validate_sicoob_order_document()','EXECUTE')::text;")=='false|false'
    assert all(checks.values()),checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
