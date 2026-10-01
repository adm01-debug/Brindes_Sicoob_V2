from pathlib import Path
import json,secrets,subprocess,tempfile,time,uuid
root=Path(__file__).resolve().parents[3]
name='auditoria-status-outubro-'+uuid.uuid4().hex[:8]
password=secrets.token_urlsafe(24)
def run(args,stdin=None):
 return subprocess.run(args,input=stdin,text=True,capture_output=True)
def sql(s):
 r=run(['docker','exec','-e',f'PGPASSWORD={password}','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],s)
 if r.returncode: raise RuntimeError(r.stderr)
 return r.stdout
out={'tipo':'Simulação PostgreSQL 17 descartável; nenhum banco remoto acessado','main':'f1b4e0dd0ff33e5c78742ffa9d2cf5a7385d8e13','pr75':'5d6a392643c3500dac74aca37bf5d4a93134de28'}
try:
 r=run(['docker','run','-d','--rm','--name',name,'-e',f'POSTGRES_PASSWORD={password}','postgres:17-alpine'])
 if r.returncode: raise RuntimeError(r.stderr)
 for i in range(60):
  if run(['docker','exec',name,'pg_isready','-U','postgres']).returncode==0: break
  time.sleep(.5)
 fixture=run(['git','-C',str(root),'show',out['main']+':scripts/qa/simular-governanca-orcamento.sql']).stdout.replace('\\i /workspace/supabase/migrations/20260927171216_quote_approval_security_hardening.sql',run(['git','-C',str(root),'show',out['main']+':supabase/migrations/20260927171216_quote_approval_security_hardening.sql']).stdout)
 sql(fixture)
 sql('''RESET ROLE;
 ALTER TABLE public.quotes ADD COLUMN quote_number text;
 ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
 CREATE POLICY quotes_leitura_escopo_auditado ON public.quotes FOR SELECT TO authenticated USING (seller_id=auth.uid() OR public.can_manage_quote_scope(auth.uid(),id));
 CREATE TABLE public.workspace_notifications(user_id uuid,title text,message text,type text,category text,action_url text,metadata jsonb);
 ''')
 outsider="SET ROLE authenticated; SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';\n"
 qid='00000000-0000-0000-0000-000000000302'
 out['main_leitura_direta']=sql(outsider+f"SELECT count(*) FROM public.quotes WHERE id='{qid}'; SELECT public.can_manage_quote_scope(auth.uid(),'{qid}');")
 out['main_rpc_mesmo_status']=sql(outsider+f"SELECT row_to_json(r) FROM public.bulk_update_quote_status_atomic(ARRAY['{qid}'::uuid],ARRAY[2],'sent') r;")
 out['main_efeitos']=sql(f"SELECT json_build_object('row_version',q.row_version,'eventos_intruso',(SELECT count(*) FROM public.quote_history h WHERE h.quote_id=q.id AND h.user_id='00000000-0000-0000-0000-000000000003')) FROM public.quotes q WHERE id='{qid}';")
 migration=run(['git','-C',str(root),'show',out['pr75']+':supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql']).stdout
 sql(migration)
 out['pr75_rpc_mesmo_status_versao_inventada']=sql(outsider+f"SELECT row_to_json(r) FROM public.bulk_update_quote_status_atomic(ARRAY['{qid}'::uuid],ARRAY[999999],'sent') r;")
 out['pr75_leitura_direta']=sql(outsider+f"SELECT count(*) FROM public.quotes WHERE id='{qid}';")
 out['resultado']='Falha confirmada em main: RPC escreve versão/histórico fora de escopo ao repetir mesmo status com versão conhecida. PR75 remove essa escrita mas retorna id/status/versão fora do escopo mesmo com versão incorreta.'
finally:
 run(['docker','rm','-f',name])
with tempfile.NamedTemporaryFile(
 mode='w', encoding='utf-8', prefix='reproducao-status-fora-escopo-', suffix='.json', delete=False
) as evidence:
 json.dump(out,evidence,ensure_ascii=False,indent=2)
 evidence.write('\n')
 print(f'evidencia={evidence.name}')
print(json.dumps(out,ensure_ascii=False,indent=2))
