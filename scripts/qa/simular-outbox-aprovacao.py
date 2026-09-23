"""Fila de aprovação: transações, papéis e concorrência reais sem acesso à rede."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-outbox-' + uuid.uuid4().hex[:10]
def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)
def sql(statement, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'], stdin=statement, check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result
def scalar(statement): return sql(statement).stdout.strip()
def new_request():
    ident = str(uuid.uuid4())
    sql(f"INSERT INTO public.sicoob_approval_requests(id,order_id,requester_id,status,amount_at_request,request_reason) VALUES ('{ident}','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','pending',123.45,'Motivo sintético');")
    return ident
def claim(ident):
    raw=scalar(f"SET ROLE service_role; SELECT row_to_json(d) FROM public.claim_sicoob_approval_delivery('{ident}') d;")
    return json.loads(raw) if raw else None
def finish(row,outcome='delivered',token=None):
    error = "NULL" if outcome == 'delivered' else f"'synthetic_{outcome}'"
    provider = "'provider-sintetico'" if outcome == 'delivered' else "NULL"
    return scalar(f"SET ROLE service_role; SELECT public.finish_sicoob_approval_delivery('{row['id']}','{token or row['lease_token']}','{outcome}',{error},{provider});")
checks={}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command,CONTAINER)
    sql((ROOT/'tests/scenarios/sql/sicoob-notification-outbox-fixture.sql').read_text())
    migration=(ROOT/'supabase/migrations/20260922210000_sicoob_approval_notification_outbox.sql').read_text()
    followup=(ROOT/'supabase/migrations/20260922223000_sicoob_approval_outbox_followup.sql').read_text()
    reconciliation=(ROOT/'supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql').read_text()
    sql("""
      CREATE SCHEMA cron;
      CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text UNIQUE,schedule text,command text);
      CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS
        $$ DELETE FROM cron.job WHERE jobid=$1 RETURNING true $$;
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS
        $$ INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3) RETURNING jobid $$;
    """)
    sql('BEGIN;\n'+migration+'\n'+followup+'\n'+reconciliation+'\nROLLBACK;')
    checks['dryrun_revertido']=scalar("SELECT to_regclass('public.sicoob_approval_deliveries') IS NULL;")=='t'
    sql(migration)
    legacy_request=new_request()
    legacy_delivered=scalar(f"SELECT id FROM public.sicoob_approval_deliveries WHERE request_id='{legacy_request}' AND channel='slack';")
    legacy_failed=scalar(f"SELECT id FROM public.sicoob_approval_deliveries WHERE request_id='{legacy_request}' AND channel='email';")
    sql(f"UPDATE public.sicoob_approval_deliveries SET state='delivered',delivered_at=now(),provider_id=NULL WHERE id='{legacy_delivered}'; UPDATE public.sicoob_approval_deliveries SET state='failed',last_error_code=NULL WHERE id='{legacy_failed}';")
    sql(followup)
    checks['entrega_legada_sem_recibo_vira_incerta']=scalar(f"SELECT state || '|' || last_error_code || '|' || (delivered_at IS NULL)::text FROM public.sicoob_approval_deliveries WHERE id='{legacy_delivered}';")=='uncertain|legacy_missing_provider_receipt|true'
    checks['falha_legada_recebe_codigo_estruturado']=scalar(f"SELECT state || '|' || last_error_code FROM public.sicoob_approval_deliveries WHERE id='{legacy_failed}';")=='failed|legacy_unclassified_delivery'
    sql(reconciliation)
    authenticated_id=str(uuid.uuid4())
    sql(f"GRANT INSERT ON public.sicoob_approval_requests TO authenticated; SET ROLE authenticated; INSERT INTO public.sicoob_approval_requests(id,order_id,requester_id,status,amount_at_request,request_reason) VALUES ('{authenticated_id}','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','pending',100,'Pedido autenticado'); RESET ROLE;")
    checks['trigger_enfileira_para_ator_sem_acesso_a_fila']=scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{authenticated_id}';")=='2'
    request=new_request()
    checks['trigger_enfileira_por_pa_do_pedido']=scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request}';")=='2'
    checks['pa_do_perfil_nao_redireciona']=scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request}' AND setting_id='55555555-5555-4555-8555-555555555555';")=='0'
    checks['repeticao_nao_duplica']=scalar(f"SET ROLE service_role; SELECT public.enqueue_sicoob_approval_notifications('{request}');")=='0'
    for role in ['anon','authenticated']:
        checks[role+'_nao_le_destinos']=sql(f'SET ROLE {role}; SELECT * FROM public.sicoob_approval_deliveries;',False).returncode!=0
        for name,args in [('enqueue_sicoob_approval_notifications',f"'{request}'"),('enqueue_sicoob_approval_event',f"'{request}','request_created'"),('claim_sicoob_approval_delivery','NULL'),('get_sicoob_approval_delivery_summary','NULL'),('finish_sicoob_approval_delivery',"NULL,NULL,'delivered'")]:
            checks[role+'_nao_executa_'+name]=sql(f'SET ROLE {role}; SELECT public.{name}({args});',False).returncode!=0
        checks[role+'_nao_reconcilia']=sql(f"SET ROLE {role}; SELECT public.reconcile_sicoob_approval_delivery(gen_random_uuid(),'delivered','provider','Conferência operacional válida','operador@invalid');",False).returncode!=0
        checks[role+'_nao_arquiva']=sql(f"SET ROLE {role}; SELECT public.archive_sicoob_approval_deliveries();",False).returncode!=0
    # Uma reserva não impede outro consumidor de obter uma mensagem diferente.
    proc=subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    proc.stdin.write(f"BEGIN; SET ROLE service_role; SELECT id FROM public.claim_sicoob_approval_delivery('{request}'); SELECT pg_sleep(1); COMMIT;\n")
    proc.stdin.close()
    first_id=proc.stdout.readline().strip()
    second=claim(request)
    rest=proc.stdout.read(); errors=proc.stderr.read(); assert proc.wait()==0,errors
    checks['duas_sessoes_reservam_destinos_distintos']=bool(first_id and second and first_id!=second['id'])
    checks['nao_reserva_mensagem_em_andamento']=claim(request) is None
    checks['lease_incorreto_nao_confirma']=finish(second,token=str(uuid.uuid4()))=='f'
    checks['confirmacao_valida']=finish(second)=='t'
    checks['confirmacao_repetida_negada']=finish(second)=='f'
    receipt_row=claim(new_request())
    missing_receipt=sql(f"SET ROLE service_role; SELECT public.finish_sicoob_approval_delivery('{receipt_row['id']}','{receipt_row['lease_token']}','delivered',NULL,NULL);",False)
    checks['entrega_exige_recibo_do_provedor']=missing_receipt.returncode!=0
    checks['entrega_com_recibo_valido']=finish(receipt_row)=='t'
    sql(f"UPDATE public.sicoob_approval_deliveries SET lease_expires_at=now()-interval '1 second' WHERE id='{first_id}';")
    checks['lease_expirado_nao_reenvia']=claim(request) is None
    checks['lease_expirado_exige_conferencia']=scalar(f"SELECT state FROM public.sicoob_approval_deliveries WHERE id='{first_id}';")=='uncertain'
    missing_reconciliation_receipt=sql(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{first_id}','delivered',NULL,'Conferência no painel do provedor','operador@invalid');",False)
    checks['reconciliacao_entregue_exige_recibo']=missing_reconciliation_receipt.returncode!=0
    reconciled_id=scalar(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{first_id}','delivered','provider-reconciliado','Conferência no painel do provedor','operador@invalid');")
    checks['incerta_confirmada_com_auditoria']=reconciled_id==first_id and scalar(f"SELECT state || '|' || provider_id || '|' || (reconciliation->>'operator') FROM public.sicoob_approval_deliveries WHERE id='{first_id}';")=='delivered|provider-reconciliado|operador@invalid'
    checks['reconciliacao_repetida_negada']=sql(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{first_id}','delivered','provider','Nova conferência operacional','operador@invalid');",False).returncode!=0
    # Falha parcial: retoma só o destinatário não entregue.
    request2=new_request(); first=claim(request2); finish(first)
    retry=claim(request2); finish(retry,'retry')
    checks['backoff_impede_reenvio_imediato']=claim(request2) is None
    sql(f"UPDATE public.sicoob_approval_deliveries SET available_at=now()-interval '1 second' WHERE id='{retry['id']}';")
    resumed=claim(request2)
    checks['falha_parcial_preserva_entrega']=resumed['id']==retry['id'] and resumed['attempts']==2
    checks['token_da_reserva_anterior_negado']=finish(retry)=='f'
    for attempt in range(2,6):
        finish(resumed,'retry')
        if attempt<5:
            sql(f"UPDATE public.sicoob_approval_deliveries SET available_at=now()-interval '1 second' WHERE id='{retry['id']}';")
            resumed=claim(request2)
    checks['cinco_tentativas_encerram_retry']=scalar(f"SELECT state FROM public.sicoob_approval_deliveries WHERE id='{retry['id']}';")=='failed'
    successor=scalar(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{retry['id']}','requeue',NULL,'Falha definitiva revisada para nova tentativa','operador@invalid');")
    successor_state=scalar(f"SELECT state || '|' || generation::text || '|' || supersedes_delivery_id::text FROM public.sicoob_approval_deliveries WHERE id='{successor}';")
    checks['falha_reenfileirada_em_nova_geracao']=successor_state==f"pending|{retry['generation']+1}|{retry['id']}"
    checks['requeue_nao_cria_ramo']=sql(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{retry['id']}','requeue',NULL,'Tentativa duplicada de reconciliação','operador@invalid');",False).returncode!=0
    decided_request=new_request(); decided_row=claim(decided_request); finish(decided_row,'failed')
    sql(f"UPDATE public.sicoob_approval_requests SET status='approved' WHERE id='{decided_request}';")
    checks['solicitacao_decidida_nao_reenfileira']=sql(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{decided_row['id']}','requeue',NULL,'Solicitação já possui uma decisão final','operador@invalid');",False).returncode!=0
    for column,value in [('is_active','false'),('recipient_email',"'novo@example.invalid'")]:
        request3=new_request()
        original_email_id=scalar(f"SELECT id FROM public.sicoob_approval_deliveries WHERE request_id='{request3}' AND channel='email';")
        sql(f"UPDATE public.pa_notification_settings SET {column}={value} WHERE channel='email';")
        current=claim(request3)
        changed_ok=bool(current) and scalar(f"SELECT state FROM public.sicoob_approval_deliveries WHERE id='{original_email_id}';")=='cancelled'
        if column=='recipient_email':
            changed_ok=changed_ok and scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request3}' AND channel='email';")=='2'
        sql("UPDATE public.pa_notification_settings SET is_active=true, recipient_email='qa@example.invalid' WHERE id='44444444-4444-4444-8444-444444444444';")
        if column=='is_active':
            claim(request3)
            changed_ok=changed_ok and scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request3}' AND channel='email';")=='2'
        checks['mudanca_'+column+'_cancela_email']=changed_ok
    request_destination=new_request()
    sql("UPDATE public.pa_notification_settings SET recipient_email='corrigido@example.invalid' WHERE channel='email';")
    claim(request_destination)
    checks['destino_corrigido_gera_nova_entrega']=scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request_destination}' AND channel='email';")=='2'
    checks['nova_geracao_usa_destino_corrigido']=scalar(f"SELECT destination || '|' || generation::text FROM public.sicoob_approval_deliveries WHERE request_id='{request_destination}' AND channel='email' ORDER BY generation DESC LIMIT 1;")=='corrigido@example.invalid|2'
    checks['enqueue_repetido_nao_duplica_destino_corrigido']=scalar(f"SET ROLE service_role; SELECT public.enqueue_sicoob_approval_notifications('{request_destination}');")=='0'
    sql("UPDATE public.pa_notification_settings SET recipient_email='qa@example.invalid' WHERE channel='email';")
    request_attempted=new_request()
    attempted_id=scalar(f"SELECT id FROM public.sicoob_approval_deliveries WHERE request_id='{request_attempted}' AND channel='email';")
    sql(f"UPDATE public.sicoob_approval_deliveries SET state='retry',attempts=1,available_at=now()-interval '1 second',last_error_code='provider_timeout' WHERE id='{attempted_id}'; UPDATE public.pa_notification_settings SET recipient_email='revisado@example.invalid' WHERE channel='email';")
    claim(request_attempted)
    checks['destino_tentado_vira_incerto_sem_reenvio']=scalar(f"SELECT state || '|' || last_error_code FROM public.sicoob_approval_deliveries WHERE id='{attempted_id}';")=='uncertain|destination_changed_after_attempt' and scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request_attempted}' AND channel='email';")=='1'
    attempted_successor=scalar(f"SET ROLE service_role; SELECT public.reconcile_sicoob_approval_delivery('{attempted_id}','requeue',NULL,'Destino corrigido após conferência da tentativa anterior','operador@invalid');")
    checks['destino_tentado_exige_reconciliacao']=scalar(f"SELECT destination || '|' || generation::text FROM public.sicoob_approval_deliveries WHERE id='{attempted_successor}';")=='revisado@example.invalid|2'
    sql("UPDATE public.pa_notification_settings SET recipient_email='qa@example.invalid' WHERE channel='email';")
    request_escalated=new_request()
    sql(f"UPDATE public.sicoob_approval_requests SET metadata=jsonb_build_object('escalated',true) WHERE id='{request_escalated}';")
    checks['escalacao_gera_evento_distinto']=scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE request_id='{request_escalated}' AND event_kind='escalated_to_board';")=='2'
    request4=new_request()
    sql(f"UPDATE public.sicoob_approval_requests SET status='approved' WHERE id='{request4}';")
    checks['decisao_cancela_pendencias']=claim(request4) is None
    request5=new_request()
    sql("DELETE FROM public.pa_notification_settings WHERE id='44444444-4444-4444-8444-444444444444'; INSERT INTO public.pa_notification_settings VALUES ('77777777-7777-4777-8777-777777777777','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','email',NULL,'qa@example.invalid',true);")
    checks['recriar_configuracao_nao_duplica_canal']=scalar(f"SET ROLE service_role; SELECT public.enqueue_sicoob_approval_notifications('{request5}');")=='0'
    sql(f"UPDATE public.sicoob_approval_deliveries SET updated_at=now()-interval '181 days', delivered_at=now()-interval '181 days' WHERE id='{receipt_row['id']}';")
    checks['retencao_arquiva_terminal']=scalar("SET ROLE service_role; SELECT public.archive_sicoob_approval_deliveries();")=='1' and scalar(f"SELECT count(*) FROM public.sicoob_approval_deliveries WHERE id='{receipt_row['id']}';")=='0'
    checks['arquivo_preserva_registro_completo']=scalar(f"SELECT delivery_record->>'provider_id' FROM public.sicoob_approval_delivery_archive WHERE delivery_id='{receipt_row['id']}';")=='provider-sintetico'
    checks['cron_retencao_configurado']=scalar("SELECT schedule || '|' || command FROM cron.job WHERE jobname='sicoob-approval-outbox-retention';")=='23 3 * * *|SELECT public.archive_sicoob_approval_deliveries();'
    before=scalar('SELECT count(*) FROM public.sicoob_approval_deliveries;')
    sql("BEGIN; INSERT INTO public.sicoob_approval_requests(id,order_id,requester_id,status,amount_at_request,request_reason) SELECT gen_random_uuid(),order_id,requester_id,'pending',10,'Rollback' FROM public.sicoob_approval_requests LIMIT 1; ROLLBACK;")
    checks['rollback_nao_deixa_entrega_orfa']=scalar('SELECT count(*) FROM public.sicoob_approval_deliveries;')==before
    sql("CREATE FUNCTION public.fixture_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Falha sintética'; END; $$; CREATE TRIGGER fixture_fail BEFORE INSERT ON public.sicoob_approval_deliveries FOR EACH ROW EXECUTE FUNCTION public.fixture_fail();")
    before=scalar('SELECT count(*) FROM public.sicoob_approval_requests;')
    failed=sql("INSERT INTO public.sicoob_approval_requests(id,order_id,requester_id,status,amount_at_request,request_reason) SELECT gen_random_uuid(),order_id,requester_id,'pending',10,'Falha' FROM public.sicoob_approval_requests LIMIT 1;",False)
    checks['falha_ao_enfileirar_reverte_solicitacao']=failed.returncode!=0 and scalar('SELECT count(*) FROM public.sicoob_approval_requests;')==before
    assert all(checks.values()), {**checks, 'successor_state_observado': locals().get('successor_state')}
    result={'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks}
    evidence=ROOT/'docs/execucao/evidencias/notificacoes-duraveis-20260922/simulacao.json'
    evidence.parent.mkdir(parents=True,exist_ok=True)
    evidence.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
