"""Aprovação por token: papéis PostgreSQL reais, rollback e duas sessões."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
GOVERNANCE_FIX = ROOT / 'supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql'
CONTAINER = 'sicoob-aprovacao-publica-' + uuid.uuid4().hex[:10]
SELLER = '11111111-1111-4111-8111-111111111111'
OTHER = '22222222-2222-4222-8222-222222222222'
SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZsAAAAASUVORK5CYII='
def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)
def sql(statement, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'], stdin=statement, check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result
def actor(statement, who=SELLER, role='authenticated', check=True):
    return sql(f"SET ROLE {role}; SET request.jwt.claim.sub='{who}'; {statement}", check)
def new_quote():
    ident = str(uuid.uuid4())
    sql(f"INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total) VALUES ('{ident}','{SELLER}','TESTE','Cliente sintético',100);")
    sql(f"INSERT INTO public.quote_items(quote_id,product_id,product_name,product_sku,quantity,unit_price,notes) VALUES ('{ident}','produto-1','Caneca térmica','CAN-001',10,10,'Gravação frontal');")
    return ident
def new_governed_quote():
    ident = str(uuid.uuid4())
    sql(f"INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) VALUES ('{ident}','{SELLER}','TESTE','Cliente sintético',100,'draft');")
    sql(f"INSERT INTO public.quote_items(quote_id,product_id,product_name,product_sku,quantity,unit_price,notes) VALUES ('{ident}','produto-1','Caneca térmica','CAN-001',10,10,'Gravação frontal');")
    sql(f"BEGIN; SELECT set_config('app.quote_governance_write','true',true); UPDATE public.quotes SET status='sent' WHERE id='{ident}'; COMMIT;")
    return ident
def issue(quote, token):
    return actor(f"INSERT INTO public.quote_approval_tokens(quote_id,token,seller_id) VALUES ('{quote}','{token}','{SELLER}');")
def signed(token, response='approved'):
    return f"SELECT public.submit_signed_quote_response('{token}','{response}','Pessoa Teste','12345678901','{SIGNATURE}');"
checks = {}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command, CONTAINER)
    sql((ROOT/'tests/scenarios/sql/public-quote-approval-fixture.sql').read_text())
    sql((ROOT/'supabase/migrations/20260922190000_audit_effective_function_acl.sql').read_text())
    old_sql = (ROOT/'supabase/migrations/20260317221910_b5e8362e-512f-45eb-98e3-f06aafec980d.sql').read_text()
    old_sql = old_sql[old_sql.index('CREATE OR REPLACE FUNCTION'):old_sql.index('-- Fix 2:')]
    sql(old_sql)
    q = new_quote()
    actor(f"INSERT INTO public.quote_approval_tokens(quote_id,token,seller_id) VALUES ('{q}','forjado-legado','{OTHER}');", who=OTHER)
    checks['falha_antiga_token_alheio_reproduzida'] = sql("SELECT count(*)=1 FROM public.quote_approval_tokens WHERE token='forjado-legado';").stdout.strip() == 't'
    sql(f"UPDATE public.quotes SET internal_notes='alteração comum' WHERE id='{q}';")
    checks['falha_antiga_versao_comercial_incrementada'] = sql(f"SELECT version=2 FROM public.quotes WHERE id='{q}';").stdout.strip() == 't'
    checks['falha_antiga_pending_reproduzida'] = actor(f"INSERT INTO public.quote_approval_tokens(quote_id,token,seller_id,status) VALUES ('{q}','legado','{SELLER}','pending');", check=False).returncode != 0
    checks['rls_anon_nao_le_orcamento'] = actor('SELECT count(*) FROM public.quotes;', role='anon').stdout.strip() == '0'
    issue(q, 'legado')
    actor("SELECT public.submit_quote_response('legado','approved',NULL);", role='anon')
    checks['falha_antiga_orcamento_nao_atualizado'] = sql(f"SELECT status='sent' FROM public.quotes WHERE id='{q}';").stdout.strip() == 't'
    migration = (ROOT/'supabase/migrations/20260922200000_public_quote_approval_contract.sql').read_text()
    sql('BEGIN;'+migration+'ROLLBACK;')
    checks['dryrun_revertido'] = sql("SELECT to_regprocedure('public.get_public_quote_approval(text)') IS NULL;").stdout.strip() == 't'
    sql(migration)
    sql(migration)
    checks['token_alheio_antigo_nao_expoe_orcamento'] = actor("SELECT public.get_public_quote_approval('forjado-legado') IS NULL;"+signed('forjado-legado'),role='anon').stdout.strip() == 't\nf'
    q = new_quote(); issue(q, 'valido')
    projection = json.loads(actor("SELECT public.get_public_quote_approval('valido');", role='anon').stdout)
    checks['projecao_minima'] = set(projection) == {'quote_number','client_name','total','valid_until','status','response','responded_at','expires_at'} and projection['total'] == 100
    checks['forjar_token_de_outro_vendedor_negado'] = actor(f"INSERT INTO public.quote_approval_tokens(quote_id,token,seller_id) VALUES ('{q}','forjado','{OTHER}');", who=OTHER, check=False).returncode != 0
    checks['trocar_destino_negado'] = actor("UPDATE public.quote_approval_tokens SET quote_id='outro' WHERE token='valido';",check=False).returncode != 0
    checks['forjar_resposta_direta_negado'] = actor("UPDATE public.quote_approval_tokens SET response='approved', responded_at=now() WHERE token='valido';",check=False).returncode != 0
    checks['assinatura_invalida_negada'] = actor("SELECT public.submit_signed_quote_response('valido','approved','Nome','12345678901','data:text/html;base64,AAAA');",role='anon',check=False).returncode != 0
    checks['nucleo_privado_negado'] = actor("SELECT public.apply_local_quote_approval_response('valido','approved',NULL,NULL,NULL,NULL);",role='anon',check=False).returncode != 0
    checks['resposta_nula_negada'] = actor("SELECT public.submit_quote_response('valido',NULL,NULL);",role='anon',check=False).returncode != 0
    checks['assinatura_e_resposta_confirmadas'] = actor(signed('valido'),role='anon').stdout.strip() == 't'
    checks['efeitos_atomicos'] = sql(f"SELECT q.status='approved' AND t.response='approved' AND t.signature_data_url='{SIGNATURE}' AND length(t.signature_hash)=64 AND t.signed_at IS NOT NULL AND (SELECT count(*) FROM public.quote_history WHERE quote_id=q.id AND action='public_response')=1 FROM public.quotes q JOIN public.quote_approval_tokens t ON t.quote_id=q.id::text WHERE t.token='valido';").stdout.strip() == 't'
    checks['versao_comercial_preservada'] = sql(f"SELECT version=1 AND row_version=2 FROM public.quotes WHERE id='{q}';").stdout.strip() == 't'
    checks['repeticao_negada'] = actor(signed('valido','rejected'),role='anon').stdout.strip() == 'f'
    checks['confirmacao_recarregavel'] = actor("SELECT public.get_public_quote_approval('valido')->>'response';",role='anon').stdout.strip() == 'approved'
    checks['rpc_legada_nao_vaza_assinatura'] = actor("SELECT signer_document IS NULL AND signature_data_url IS NULL AND token IS NULL FROM public.get_quote_token_by_value('valido');",role='anon').stdout.strip() == 't'
    for token, adjustment in [('expirado', "expires_at=now()-interval '1 second'"), ('revogado', "status='revoked'")]:
        q2 = new_quote(); issue(q2, token)
        sql(f"UPDATE public.quote_approval_tokens SET {adjustment} WHERE token='{token}';")
        checks[token+'_nao_le_nem_responde'] = actor(f"SELECT public.get_public_quote_approval('{token}') IS NULL;"+signed(token),role='anon').stdout.strip() == 't\nf'
    q2 = new_quote(); issue(q2, 'rollback')
    sql("CREATE FUNCTION public.fail_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$; CREATE TRIGGER fail_history BEFORE INSERT ON public.quote_history FOR EACH ROW WHEN (NEW.action='public_response') EXECUTE FUNCTION public.fail_history();")
    checks['falha_no_historico_reverte_tudo'] = actor(signed('rollback'),role='anon',check=False).returncode != 0 and sql(f"SELECT q.status='sent' AND t.status='active' AND t.responded_at IS NULL AND t.signature_data_url IS NULL FROM public.quotes q JOIN public.quote_approval_tokens t ON t.quote_id=q.id::text WHERE t.token='rollback';").stdout.strip() == 't'
    sql('DROP TRIGGER fail_history ON public.quote_history;')
    for token, change in [('versao-antiga', 'is_latest_version=false'), ('prazo-vencido', "valid_until=now()-interval '2 days'")]:
        quote = new_quote(); issue(quote,token)
        sql(f"UPDATE public.quotes SET {change} WHERE id='{quote}';")
        checks[token+'_indisponivel'] = actor(f"SELECT public.get_public_quote_approval('{token}') IS NULL;"+signed(token),role='anon').stdout.strip() == 't\nf'
    quote = new_quote(); issue(quote,'portador-logado')
    checks['portador_logado_responde_por_token'] = actor(signed('portador-logado'),who=OTHER).stdout.strip() == 't'
    for separate in (False, True):
        q3 = new_quote(); token1 = 'concorrente-'+str(separate); token2 = token1+'-outro' if separate else token1
        issue(q3, token1)
        if separate: issue(q3, token2)
        first = subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        first.stdin.write("BEGIN; SET ROLE anon; " + signed(token1) + " SELECT pg_sleep(0.5); COMMIT;")
        first.stdin.close(); first.stdin = None
        second = actor(signed(token2,'rejected'),role='anon')
        output, error = first.communicate(timeout=20)
        assert first.returncode == 0, error
        checks['concorrencia_links_distintos' if separate else 'concorrencia_mesmo_link'] = sorted([output.strip(),second.stdout.strip()]) == ['f','t'] and sql(f"SELECT count(*) FROM public.quote_history WHERE quote_id='{q3}' AND action='public_response';").stdout.strip() == '1'
    quote = new_quote(); issue(quote,'expira-no-lock')
    blocker = subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    blocker.stdin.write(f"BEGIN; SELECT id FROM public.quotes WHERE id='{quote}' FOR UPDATE; SELECT pg_sleep(2); COMMIT;")
    blocker.stdin.close(); blocker.stdin = None
    assert blocker.stdout.readline().strip() == quote
    sql("UPDATE public.quote_approval_tokens SET expires_at=clock_timestamp()+interval '1 second' WHERE token='expira-no-lock';")
    response = sql("BEGIN; SELECT clock_timestamp() < expires_at FROM public.quote_approval_tokens WHERE token='expira-no-lock'; SET LOCAL ROLE anon;" + signed('expira-no-lock') + "COMMIT;")
    blocker.communicate(timeout=20)
    checks['prazo_reavaliado_apos_espera'] = response.stdout.strip() == 't\nf'

    # Contrato endurecido: somente a Edge Function (service_role) consulta e
    # responde, com rate limit persistente e evidência HMAC versionada.
    sql("INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES ('quote_approval_evidence_hmac','chave-sintetica-com-mais-de-trinta-e-dois-bytes-2026');")
    hardened = (ROOT/'supabase/migrations/20260922225000_secure_public_quote_approval.sql').read_text()
    sql(hardened)
    checks['historico_legado_preservado'] = sql("SELECT count(*)>=1 FROM public.quote_approval_tokens WHERE signature_data_url IS NOT NULL AND signature_evidence IS NULL;").stdout.strip() == 't'
    checks['anon_sem_acesso_direto'] = (
      actor("SELECT public.get_public_quote_approval('valido');",role='anon',check=False).returncode != 0
      and actor("SELECT public.submit_signed_quote_response('valido','approved','Pessoa','12345678901','"+SIGNATURE+"','127.0.0.1','teste');",role='anon',check=False).returncode != 0
    )
    viewed_quote = new_quote(); issue(viewed_quote, 'visualizado')
    viewed_payload = json.loads(actor(
      "SELECT public.get_public_quote_approval('visualizado');", role='service_role'
    ).stdout)
    first_viewed_at = sql("SELECT viewed_at::text FROM public.quote_approval_tokens WHERE token='visualizado';").stdout.strip()
    actor("SELECT public.get_public_quote_approval('visualizado');", role='service_role')
    checks['consulta_publica_registra_visualizacao']=viewed_payload['quote_number']=='TESTE' and bool(first_viewed_at)
    checks['visualizacao_repetida_preserva_primeiro_instante']=sql(
      f"SELECT viewed_at::text='{first_viewed_at}' FROM public.quote_approval_tokens WHERE token='visualizado';"
    ).stdout.strip()=='t'
    quote = new_quote(); issue(quote,'hmac-valido')
    hardened_response = actor(
      "SELECT public.submit_signed_quote_response('hmac-valido','approved','Pessoa Teste','12345678901','"+SIGNATURE+"','203.0.113.10','navegador-teste');",
      role='service_role'
    )
    checks['resposta_hmac_confirmada'] = hardened_response.stdout.strip() == 't'
    checks['evidencia_hmac_completa'] = sql("""
      SELECT signature_algorithm='hmac-sha256-v1'
        AND signer_ip='203.0.113.10' AND signer_user_agent='navegador-teste'
        AND signature_key_id IS NOT NULL
        AND signature_evidence->>'token_sha256'=encode(extensions.digest(convert_to('hmac-valido','UTF8'),'sha256'),'hex')
        AND signature_hash=encode(extensions.hmac(convert_to(signature_evidence::text,'UTF8'),
          convert_to('chave-sintetica-com-mais-de-trinta-e-dois-bytes-2026','UTF8'),'sha256'),'hex')
      FROM public.quote_approval_tokens WHERE token='hmac-valido';
    """).stdout.strip() == 't'
    hmac_v1_id = sql("SELECT id FROM public.quote_approval_tokens WHERE token='hmac-valido';").stdout.strip()
    checks['verificacao_criptografica_positiva'] = actor(f"SELECT public.verify_quote_approval_signature('{hmac_v1_id}');",role='service_role').stdout.strip() == 't'
    checks['snapshot_comercial_assinado'] = sql("""
      SELECT signature_evidence ? 'quote_snapshot'
        AND signature_evidence->>'quote_snapshot_sha256' = encode(extensions.digest(
          convert_to((signature_evidence->'quote_snapshot')::text,'UTF8'),'sha256'),'hex')
        AND jsonb_array_length(signature_evidence->'quote_snapshot'->'items') = 1
      FROM public.quote_approval_tokens WHERE token='hmac-valido';
    """).stdout.strip() == 't'
    checks['adulteracao_detectavel'] = sql("""
      SELECT signature_hash<>encode(extensions.hmac(convert_to(
          jsonb_set(signature_evidence,'{response}','\"rejected\"')::text,'UTF8'),
          convert_to('chave-sintetica-com-mais-de-trinta-e-dois-bytes-2026','UTF8'),'sha256'),'hex')
      FROM public.quote_approval_tokens WHERE token='hmac-valido';
    """).stdout.strip() == 't'
    sql(f"UPDATE public.quote_items SET quantity=11 WHERE quote_id=(SELECT quote_id::uuid FROM public.quote_approval_tokens WHERE id='{hmac_v1_id}');")
    checks['alteracao_posterior_do_orcamento_detectada'] = actor(
      f"SELECT NOT public.verify_quote_approval_signature('{hmac_v1_id}');", role='service_role'
    ).stdout.strip() == 't'
    sql(f"UPDATE public.quote_items SET quantity=10 WHERE quote_id=(SELECT quote_id::uuid FROM public.quote_approval_tokens WHERE id='{hmac_v1_id}');")
    sql("INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES ('quote_approval_evidence_hmac_v2','segunda-chave-sintetica-com-mais-de-trinta-e-dois-bytes');")
    actor("SELECT public.rotate_quote_approval_evidence_key('quote_approval_evidence_hmac_v2');",role='service_role')
    rotated_quote = new_quote(); issue(rotated_quote,'hmac-v2')
    actor("SELECT public.submit_signed_quote_response('hmac-v2','approved','Pessoa Teste','12345678901','"+SIGNATURE+"','203.0.113.12','teste-v2');",role='service_role')
    hmac_v2_id = sql("SELECT id FROM public.quote_approval_tokens WHERE token='hmac-v2';").stdout.strip()
    keys_differ = sql("SELECT count(DISTINCT signature_key_id)=2 FROM public.quote_approval_tokens WHERE token IN ('hmac-valido','hmac-v2');").stdout.strip() == 't'
    checks['rotacao_preserva_verificacao_historica'] = keys_differ and actor(
      f"SELECT public.verify_quote_approval_signature('{hmac_v1_id}') AND public.verify_quote_approval_signature('{hmac_v2_id}');",
      role='service_role'
    ).stdout.strip() == 't'
    checks['versao_de_chave_nao_reutilizada'] = actor("SELECT public.rotate_quote_approval_evidence_key('quote_approval_evidence_hmac_v2');",role='service_role',check=False).returncode != 0
    quote = new_quote(); issue(quote,'sem-chave')
    sql("DELETE FROM vault.decrypted_secrets WHERE name='quote_approval_evidence_hmac_v2';")
    denied = actor("SELECT public.submit_signed_quote_response('sem-chave','approved','Pessoa Teste','12345678901','"+SIGNATURE+"','203.0.113.11','teste');",role='service_role',check=False)
    checks['chave_ausente_falha_fechada_e_reverte'] = denied.returncode != 0 and sql(
      "SELECT q.status='sent' AND t.status='active' AND t.responded_at IS NULL FROM public.quotes q JOIN public.quote_approval_tokens t ON t.quote_id=q.id::text WHERE t.token='sem-chave';"
    ).stdout.strip() == 't'
    limits = [json.loads(actor("SELECT public.check_rate_limit('origem-token','quote-approval:respond',2,60,300);",role='service_role').stdout) for _ in range(3)]
    checks['rate_limit_persistente'] = [item['allowed'] for item in limits] == [True,True,False]

    # Reproduz o esquema atual: o gate de governança foi instalado depois do
    # fluxo público e bloqueia o escritor autorizado até a migration corretiva.
    sql("""
      CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
      SET search_path=pg_catalog,public AS $guard$
      BEGIN
        IF current_setting('app.quote_governance_write',true)='true' THEN RETURN NEW; END IF;
        IF TG_OP='INSERT' AND COALESCE(NEW.status,'draft')<>'draft' THEN
          RAISE EXCEPTION 'A criação de orçamento deve iniciar como rascunho.' USING ERRCODE='42501';
        END IF;
        IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
          RAISE EXCEPTION 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.' USING ERRCODE='42501';
        END IF;
        RETURN NEW;
      END;
      $guard$;
      REVOKE ALL ON FUNCTION public.guard_quote_governance_write() FROM PUBLIC,anon,authenticated;
      CREATE TRIGGER aaa_guard_quote_governance_write BEFORE INSERT OR UPDATE ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.guard_quote_governance_write();
      CREATE FUNCTION public.convert_quote_to_sicoob_order(uuid)
      RETURNS TABLE(id uuid,order_number text,status text,total_amount numeric)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
      AS 'SELECT NULL::uuid,NULL::text,NULL::text,NULL::numeric WHERE false';
      REVOKE ALL ON FUNCTION public.convert_quote_to_sicoob_order(uuid) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.convert_quote_to_sicoob_order(uuid) TO authenticated,service_role;
      CREATE FUNCTION public.create_quote_version_atomic(uuid)
      RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
      AS 'SELECT $1';
      REVOKE ALL ON FUNCTION public.create_quote_version_atomic(uuid) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.create_quote_version_atomic(uuid) TO authenticated,service_role;
      CREATE FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)
      RETURNS TABLE(id uuid,status text,row_version integer)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      UPDATE public.quotes q SET status=$3 WHERE q.id=ANY($1) RETURNING q.id,q.status,q.row_version
      $writer$;
      CREATE FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text)
      RETURNS TABLE(id uuid,status text,row_version integer,approved_pdf_url text)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      UPDATE public.quotes q SET status='approved',approved_pdf_url=$3 WHERE q.id=$1
      RETURNING q.id,q.status,q.row_version,q.approved_pdf_url
      $writer$;
      CREATE FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text)
      RETURNS TABLE(request_id uuid,quote_id uuid,seller_id uuid,quote_row_version integer,requested_discount_percent numeric,max_allowed_percent numeric,negotiation_markup_percent numeric,real_discount_percent numeric)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      SELECT gen_random_uuid(),q.id,q.seller_id,q.row_version,$3,0::numeric,0::numeric,$3 FROM public.quotes q WHERE q.id=$1
      $writer$;
      CREATE FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text)
      RETURNS TABLE(request_id uuid,quote_id uuid,seller_id uuid,quote_row_version integer,requested_discount_percent numeric,max_allowed_percent numeric,request_status text)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      SELECT $1,NULL::uuid,NULL::uuid,$2,0::numeric,0::numeric,CASE WHEN $3 THEN 'approved' ELSE 'rejected' END
      $writer$;
      REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text) TO authenticated;
      INSERT INTO vault.decrypted_secrets(name,decrypted_secret)
      VALUES ('quote_approval_evidence_hmac_v2','segunda-chave-sintetica-com-mais-de-trinta-e-dois-bytes');
    """)
    blocked_quote = new_governed_quote(); issue(blocked_quote,'governanca-bloqueada')
    blocked = actor(
      "SELECT public.submit_signed_quote_response('governanca-bloqueada','approved','Pessoa Teste','12345678901','"+SIGNATURE+"','203.0.113.20','teste-gate');",
      role='service_role', check=False
    )
    checks['falha_real_do_gate_reproduzida'] = blocked.returncode != 0 and sql(
      "SELECT q.status='sent' AND t.status='active' FROM public.quotes q JOIN public.quote_approval_tokens t ON t.quote_id=q.id::text WHERE t.token='governanca-bloqueada';"
    ).stdout.strip() == 't'

    governance_fix = GOVERNANCE_FIX.read_text()
    sql('BEGIN;'+governance_fix+'ROLLBACK;')
    checks['migration_governanca_dryrun_revertida'] = sql(
      "SELECT to_regprocedure('public.convert_quote_to_sicoob_order_core_20261013(uuid)') IS NULL;"
    ).stdout.strip() == 't'
    sql(governance_fix)

    forged_insert_quote = str(uuid.uuid4())
    forged_insert = actor(
      "INSERT INTO public.quotes "
      "(id,seller_id,quote_number,client_name,total,status,client_response,"
      "client_response_at,client_response_notes,sent_at,version,row_version,"
      "is_latest_version,is_active) VALUES "
      f"('{forged_insert_quote}','{SELLER}','FORJADO','Cliente sintético',100,"
      "'draft','approved',now(),'resposta falsa',now(),9,9,false,false);",
      check=False,
    )
    canonical_insert_quote = str(uuid.uuid4())
    canonical_insert = actor(
      "INSERT INTO public.quotes "
      "(id,seller_id,quote_number,client_name,total,status) VALUES "
      f"('{canonical_insert_quote}','{SELLER}','CANONICO','Cliente sintético',100,'draft') "
      "RETURNING id;",
    )
    forged_consolidation_insert = actor(
      "INSERT INTO public.quotes "
      "(id,seller_id,quote_number,client_name,total,status,consolidation_id) VALUES "
      f"('{uuid.uuid4()}','{SELLER}','FORJA-CONSOLIDACAO','Cliente sintético',100,"
      f"'draft','{uuid.uuid4()}');",
      check=False,
    )
    forged_reorder_insert = actor(
      "BEGIN; SELECT set_config('app.sicoob_reorder_operation','create',true); "
      "INSERT INTO public.quotes "
      "(id,seller_id,quote_number,client_name,total,status,reorder_source_quote_id) VALUES "
      f"('{uuid.uuid4()}','{SELLER}','FORJA-RECOMPRA','Cliente sintético',100,"
      f"'draft','{uuid.uuid4()}'); COMMIT;",
      check=False,
    )
    checks['insercao_direta_nao_forja_resposta_ou_versao'] = (
      forged_insert.returncode != 0
      and forged_consolidation_insert.returncode != 0
      and forged_reorder_insert.returncode != 0
      and canonical_insert.stdout.strip() == canonical_insert_quote
      and sql(
        f"SELECT client_response IS NULL AND client_response_at IS NULL "
        f"AND sent_at IS NULL AND version=1 AND row_version=1 "
        f"AND is_latest_version AND is_active FROM public.quotes WHERE id='{canonical_insert_quote}';"
      ).stdout.strip() == 't'
    )

    consolidated_quote = str(uuid.uuid4())
    consolidation_id = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{consolidated_quote}','{SELLER}','CONSOLIDADO','Cliente sintético',100,'draft');"
      "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
      f"UPDATE public.quotes SET status='approved_singular' WHERE id='{consolidated_quote}'; COMMIT;"
    )
    forged_consolidation = actor(
      f"UPDATE public.quotes SET consolidation_id='{consolidation_id}' WHERE id='{consolidated_quote}';",
      check=False,
    )
    authorized_consolidation = sql(
      f"UPDATE public.quotes SET consolidation_id='{consolidation_id}', updated_at=clock_timestamp() "
      f"WHERE id='{consolidated_quote}' RETURNING consolidation_id;"
    )
    forged_unlink = actor(
      f"UPDATE public.quotes SET consolidation_id=NULL WHERE id='{consolidated_quote}';",
      check=False,
    )
    row_version_before_touch = sql(
      f"SELECT row_version FROM public.quotes WHERE id='{consolidated_quote}';"
    ).stdout.strip()
    forged_touch = actor(
      f"UPDATE public.quotes SET updated_at=now()+interval '1 minute' WHERE id='{consolidated_quote}';",
      check=False,
    )
    forged_atomic_touch = actor(
      "BEGIN; SELECT set_config('app.quote_atomic_save','true',true); "
      f"UPDATE public.quotes SET updated_at=now()+interval '1 minute' "
      f"WHERE id='{consolidated_quote}'; COMMIT;",
      check=False,
    )
    checks['vinculo_de_consolidacao_so_e_preenchido_pelo_fluxo_privilegiado'] = (
      forged_consolidation.returncode != 0
      and authorized_consolidation.stdout.strip() == consolidation_id
      and forged_unlink.returncode != 0
      and sql(
        f"SELECT consolidation_id='{consolidation_id}' FROM public.quotes WHERE id='{consolidated_quote}';"
      ).stdout.strip() == 't'
    )
    checks['toque_direto_em_updated_at_nao_avanca_versao'] = (
      forged_touch.returncode != 0
      and forged_atomic_touch.returncode != 0
      and sql(
        f"SELECT row_version={row_version_before_touch} FROM public.quotes WHERE id='{consolidated_quote}';"
      ).stdout.strip() == 't'
    )
    forged_governance_flag = actor(
      "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
      f"UPDATE public.quotes SET status='approved' WHERE id='{canonical_insert_quote}'; COMMIT;",
      check=False,
    )
    checks['flag_de_governanca_nao_elevavel_por_cliente'] = (
      forged_governance_flag.returncode != 0
      and sql(
        f"SELECT status='draft' FROM public.quotes WHERE id='{canonical_insert_quote}';"
      ).stdout.strip() == 't'
    )

    reorder_quote = str(uuid.uuid4())
    reorder_source = str(uuid.uuid4())
    sql(
      "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
      "INSERT INTO public.quotes "
      "(id,seller_id,quote_number,client_name,total,status,reorder_source_quote_id,"
      "catalog_revalidated_at,catalog_valid_until) VALUES "
      f"('{reorder_quote}','{SELLER}','RECOMPRA','Cliente sintético',100,'draft',"
      f"'{reorder_source}',now(),now()+interval '5 minutes'); COMMIT;"
    )
    forged_reorder_unlink = actor(
      f"UPDATE public.quotes SET reorder_source_quote_id=NULL, catalog_valid_until=NULL "
      f"WHERE id='{reorder_quote}';",
      check=False,
    )
    checks['linhagem_e_validade_da_recompra_sao_imutaveis_diretamente'] = (
      forged_reorder_unlink.returncode != 0
      and sql(
        f"SELECT reorder_source_quote_id='{reorder_source}' AND catalog_valid_until IS NOT NULL "
        f"FROM public.quotes WHERE id='{reorder_quote}';"
      ).stdout.strip() == 't'
    )

    status_quote = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{status_quote}','{SELLER}','STATUS','Cliente sintético',100,'draft');"
    )
    status_writer = actor(
      "BEGIN; SELECT count(*) FROM public.bulk_update_quote_status_atomic("
      f"ARRAY['{status_quote}'::uuid],ARRAY[1],'sent',NULL);"
      "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;"
    ).stdout.strip()
    checks['rpc_de_status_atravessa_gate_e_restaura_contexto'] = (
      status_writer == '1\nrestaurado'
      and sql(f"SELECT status='sent' FROM public.quotes WHERE id='{status_quote}';").stdout.strip() == 't'
    )
    auxiliary_quote = str(uuid.uuid4())
    auxiliary_request = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{auxiliary_quote}','{SELLER}','AUX','Cliente sintético',100,'draft');"
    )
    auxiliary_writers = actor(
      "BEGIN; SELECT count(*) FROM public.approve_quote_with_pdf_atomic("
      f"'{auxiliary_quote}',1,'quotes/{auxiliary_quote}/aprovado.pdf',NULL);"
      "SELECT count(*) FROM public.request_discount_approval_atomic("
      f"'{auxiliary_quote}',2,15,NULL);"
      "SELECT count(*) FROM public.respond_discount_approval_atomic("
      f"'{auxiliary_request}',2,true,NULL);"
      "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;"
    ).stdout.strip()
    checks['rpcs_auxiliares_atravessam_gate_e_restauram_contexto'] = (
      auxiliary_writers == '1\n1\n1\nrestaurado'
    )

    fixed_quote = new_governed_quote(); issue(fixed_quote,'governanca-corrigida')
    fixed = actor(
      "BEGIN; SELECT public.submit_signed_quote_response('governanca-corrigida','approved','Pessoa Teste','12345678901','"+SIGNATURE+"','203.0.113.21','teste-corrigido');"
      "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;",
      role='service_role'
    )
    checks['aprovacao_publica_atravessa_gate_e_restaura_contexto'] = fixed.stdout.strip() == 't\nrestaurado'
    fixed_item = sql(f"SELECT id FROM public.quote_items WHERE quote_id='{fixed_quote}';").stdout.strip()
    frozen_item = actor(f"UPDATE public.quote_items SET quantity=99 WHERE id='{fixed_item}';", check=False)
    frozen_header = actor(f"UPDATE public.quotes SET total=999 WHERE id='{fixed_quote}';", check=False)
    frozen_delete = actor(f"DELETE FROM public.quotes WHERE id='{fixed_quote}';", check=False)
    checks['conteudo_aprovado_e_imutavel'] = (
      frozen_item.returncode != 0 and frozen_header.returncode != 0
      and frozen_delete.returncode != 0
      and sql(f"SELECT quantity=10 FROM public.quote_items WHERE id='{fixed_item}';").stdout.strip() == 't'
      and sql(f"SELECT total=100 FROM public.quotes WHERE id='{fixed_quote}';").stdout.strip() == 't'
    )
    forged_response = actor(
      f"UPDATE public.quotes SET client_response='rejected', client_response_at=now(), client_response_notes='forjado' WHERE id='{fixed_quote}';",
      check=False,
    )
    checks['resposta_do_cliente_nao_pode_ser_forjada_diretamente'] = (
      forged_response.returncode != 0
      and sql(
        f"SELECT client_response='approved' AND client_response_notes IS NULL FROM public.quotes WHERE id='{fixed_quote}';"
      ).stdout.strip() == 't'
    )
    forged_lifecycle = actor(
      f"UPDATE public.quotes SET row_version=999, sent_at=now(), deleted_at=now(), is_active=false WHERE id='{fixed_quote}';",
      check=False,
    )
    checks['ciclo_de_vida_e_versao_nao_podem_ser_forjados'] = (
      forged_lifecycle.returncode != 0
      and sql(
        f"SELECT row_version<>999 AND sent_at IS NULL AND deleted_at IS NULL AND is_active FROM public.quotes WHERE id='{fixed_quote}';"
      ).stdout.strip() == 't'
    )
    forged_context = actor(
      "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
      f"UPDATE public.quotes SET total=777 WHERE id='{fixed_quote}'; COMMIT;",
      check=False,
    )
    checks['contexto_interno_nao_pode_ser_forjado_por_cliente'] = (
      forged_context.returncode != 0
      and sql(f"SELECT total=100 FROM public.quotes WHERE id='{fixed_quote}';").stdout.strip() == 't'
    )
    approved_delete = actor(f"DELETE FROM public.quotes WHERE id='{fixed_quote}';", check=False)
    checks['orcamento_aprovado_nao_pode_ser_excluido'] = (
      approved_delete.returncode != 0
      and sql(f"SELECT count(*)=1 FROM public.quotes WHERE id='{fixed_quote}';").stdout.strip() == 't'
      and sql(f"SELECT count(*)=1 FROM public.quote_items WHERE quote_id='{fixed_quote}';").stdout.strip() == 't'
    )
    rls_quote = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{rls_quote}','{SELLER}','RLS','Cliente sintético',100,'draft');"
      "INSERT INTO public.quote_items(quote_id,product_name,quantity,unit_price) "
      f"VALUES ('{rls_quote}','Caneca',10,10);"
    )
    rls_item = sql(f"SELECT id FROM public.quote_items WHERE quote_id='{rls_quote}';").stdout.strip()
    outsider_edit = actor(
      f"UPDATE public.quote_items SET quantity=99 WHERE id='{rls_item}' RETURNING id;",
      who=OTHER,
      check=False,
    )
    checks['rls_impede_edicao_de_item_de_outro_vendedor'] = (
      outsider_edit.returncode == 0
      and outsider_edit.stdout.strip() == ''
      and sql(f"SELECT quantity=10 FROM public.quote_items WHERE id='{rls_item}';").stdout.strip() == 't'
      and actor(f"UPDATE public.quote_items SET quantity=11 WHERE id='{rls_item}';").returncode == 0
    )

    historical_quote = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{historical_quote}','{SELLER}','HIST','Cliente sintético',100,'draft');"
      "INSERT INTO public.quote_items(quote_id,product_name,quantity,unit_price) "
      f"VALUES ('{historical_quote}','Caneca',10,10);"
      "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
      f"UPDATE public.quotes SET is_latest_version=false WHERE id='{historical_quote}'; COMMIT;"
    )
    historical_header = actor(
      f"UPDATE public.quotes SET total=999 WHERE id='{historical_quote}';",
      check=False,
    )
    historical_reactivate = actor(
      f"UPDATE public.quotes SET is_latest_version=true WHERE id='{historical_quote}';",
      check=False,
    )
    historical_delete = actor(
      f"DELETE FROM public.quotes WHERE id='{historical_quote}';",
      check=False,
    )
    checks['versao_historica_e_totalmente_imutavel'] = (
      historical_header.returncode != 0
      and historical_reactivate.returncode != 0
      and historical_delete.returncode != 0
      and sql(
        f"SELECT total=100 AND NOT is_latest_version FROM public.quotes WHERE id='{historical_quote}';"
      ).stdout.strip() == 't'
    )

    version_context = actor(
      f"BEGIN; SELECT public.create_quote_version_atomic('{rls_quote}');"
      "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;"
    ).stdout.strip()
    checks['versionamento_atravessa_gate_e_restaura_contexto'] = (
      version_context == f'{rls_quote}\nrestaurado'
    )
    draft_quote = str(uuid.uuid4())
    sql(
      "INSERT INTO public.quotes(id,seller_id,quote_number,client_name,total,status) "
      f"VALUES ('{draft_quote}','{SELLER}','RASCUNHO','Cliente sintético',100,'draft');"
      "INSERT INTO public.quote_items(quote_id,product_name,quantity,unit_price) "
      f"VALUES ('{draft_quote}','Caneca',10,10);"
      "INSERT INTO public.quote_item_personalizations(quote_item_id,total_cost) "
      f"SELECT id,5 FROM public.quote_items WHERE quote_id='{draft_quote}';"
    )
    draft_delete = actor(f"DELETE FROM public.quotes WHERE id='{draft_quote}';")
    checks['rascunho_pode_ser_excluido_com_cascata_validada'] = (
      draft_delete.returncode == 0
      and sql(f"SELECT count(*)=0 FROM public.quotes WHERE id='{draft_quote}';").stdout.strip() == 't'
      and sql(f"SELECT count(*)=0 FROM public.quote_items WHERE quote_id='{draft_quote}';").stdout.strip() == 't'
    )
    checks['gate_executa_com_privilegios_do_invocador'] = sql(
      "SELECT NOT prosecdef FROM pg_proc WHERE oid='public.guard_quote_governance_write()'::regprocedure;"
    ).stdout.strip() == 't'
    checks['gatilho_principal_cobre_exclusao'] = 'DELETE' in sql(
      "SELECT pg_get_triggerdef(oid) FROM pg_trigger "
      "WHERE tgrelid='public.quotes'::regclass AND tgname='aaa_guard_quote_governance_write';"
    ).stdout
    checks['nucleos_internos_sem_execute_externo'] = sql(
      "SELECT NOT has_function_privilege('authenticated','public.convert_quote_to_sicoob_order_core_20261013(uuid)','EXECUTE') AND NOT has_function_privilege('service_role','public.apply_local_quote_approval_response_core_20261013(text,text,text,text,text,text,text,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.create_quote_version_atomic_core_20261013(uuid)','EXECUTE');"
    ).stdout.strip() == 't'
    checks['acl_sem_violacoes'] = sql("SELECT count(*) FROM public.audit_security_definer_acl();").stdout.strip() == '0'
    assert all(checks.values()), checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
