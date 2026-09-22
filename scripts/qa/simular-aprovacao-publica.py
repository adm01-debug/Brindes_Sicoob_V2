"""Aprovação por token: papéis PostgreSQL reais, rollback e duas sessões."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
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
    checks['acl_sem_violacoes'] = sql("SELECT count(*) FROM public.audit_security_definer_acl();").stdout.strip() == '0'
    assert all(checks.values()), checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
