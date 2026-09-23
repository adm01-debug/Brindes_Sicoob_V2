"""Valida o agendamento da outbox com Vault e pg_net simulados, sem rede."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-scheduler-' + uuid.uuid4().hex[:10]
MIGRATION = ROOT / 'supabase/migrations/20260922224300_schedule_sicoob_approval_worker.sql'
MONITOR = ROOT / 'supabase/migrations/20260922225500_monitor_sicoob_approval_worker.sql'

def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)

def sql(statement, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'], stdin=statement, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def scalar(statement):
    return sql(statement).stdout.strip()

checks={}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command, CONTAINER)
    sql("""
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA vault; CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text, updated_at timestamptz DEFAULT now());
      CREATE SCHEMA net; CREATE TABLE net.calls(id bigint GENERATED ALWAYS AS IDENTITY, url text, headers jsonb, body jsonb, timeout_ms integer);
      CREATE TABLE net._http_response(id bigint PRIMARY KEY,status_code integer,content_type text,headers jsonb,content text,timed_out boolean,error_msg text,created timestamptz DEFAULT now());
      CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds integer DEFAULT 1000)
      RETURNS bigint LANGUAGE plpgsql AS $$DECLARE v_id bigint; BEGIN INSERT INTO net.calls(url,headers,body,timeout_ms) VALUES (url,headers,body,timeout_milliseconds) RETURNING id INTO v_id; RETURN v_id; END$$;
      CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY, jobname text UNIQUE, schedule text, command text);
      CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$DELETE FROM cron.job WHERE jobid=$1 RETURNING true$$;
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE plpgsql AS $$DECLARE v_id bigint; BEGIN INSERT INTO cron.job(jobname,schedule,command) VALUES ($1,$2,$3) ON CONFLICT(jobname) DO UPDATE SET schedule=excluded.schedule,command=excluded.command RETURNING jobid INTO v_id; RETURN v_id; END$$;
      CREATE TABLE public.sicoob_approval_deliveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),state text,available_at timestamptz,reconciliation jsonb);
    """)
    migration=MIGRATION.read_text(); monitor=MONITOR.read_text()
    sql('BEGIN;\n'+migration+'\n'+monitor+'\nROLLBACK;')
    checks['dry_run_sem_job'] = scalar("SELECT count(*) FROM cron.job;") == '0'
    sql(migration); sql(monitor)
    checks['job_a_cada_minuto'] = scalar("SELECT schedule||'|'||command FROM cron.job WHERE jobname='sicoob-approval-outbox-worker';") == '* * * * *|SELECT public.dispatch_sicoob_approval_worker();'
    checks['job_nao_contem_segredo'] = 'Bearer' not in scalar("SELECT command FROM cron.job WHERE jobname='sicoob-approval-outbox-worker';")
    checks['sem_vault_nao_chama_rede'] = scalar("SELECT public.dispatch_sicoob_approval_worker() IS NULL;") == 't' and scalar('SELECT count(*) FROM net.calls;') == '0'
    sql("INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES ('sicoob_project_url','https://projeto-sintetico.supabase.co'),('sicoob_approval_worker_secret',repeat('s',40));")
    checks['vault_dispara_endpoint_fixo'] = scalar("SELECT public.dispatch_sicoob_approval_worker();") == '1' and scalar("SELECT url||'|'||(body->>'action')||'|'||(headers->>'Authorization'= 'Bearer '||repeat('s',40))::text FROM net.calls;") == 'https://projeto-sintetico.supabase.co/functions/v1/sicoob-approval-notifications|process_queue|true'
    sql("INSERT INTO net._http_response(id,status_code,content,timed_out) VALUES (1,500,'falha sintética',false);")
    checks['http_500_materializado']=scalar("SELECT public.monitor_sicoob_approval_worker()->>'failed_24h';")=='1' and scalar("SELECT state||'|'||status_code FROM public.sicoob_approval_worker_dispatches WHERE request_id=1;")=='failed|500'
    sql("INSERT INTO public.sicoob_approval_deliveries(state,available_at) VALUES ('uncertain',now());")
    health=scalar("SELECT public.monitor_sicoob_approval_worker()::text;")
    checks['incerteza_pendente_torna_worker_nao_saudavel']='\"unresolved_deliveries\": 1' in health and '\"healthy\": false' in health
    sql("DELETE FROM public.sicoob_approval_deliveries;")
    sql("UPDATE vault.decrypted_secrets SET decrypted_secret='http://127.0.0.1' WHERE name='sicoob_project_url';")
    checks['url_insegura_bloqueada'] = scalar("SELECT public.dispatch_sicoob_approval_worker() IS NULL;") == 't' and scalar('SELECT count(*) FROM net.calls;') == '1'
    checks['acl_service_sem_anon'] = scalar("SELECT has_function_privilege('service_role','public.dispatch_sicoob_approval_worker()','EXECUTE')::text||'|'||has_function_privilege('anon','public.dispatch_sicoob_approval_worker()','EXECUTE')::text;") == 'true|false'
    checks['monitor_cada_dois_minutos']=scalar("SELECT schedule||'|'||command FROM cron.job WHERE jobname='sicoob-approval-outbox-monitor';")=='*/2 * * * *|SELECT public.monitor_sicoob_approval_worker();'
    sql(migration)
    checks['reaplicacao_nao_duplica_job'] = scalar("SELECT count(*) FROM cron.job WHERE jobname='sicoob-approval-outbox-worker';") == '1'
    assert all(checks.values()), checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
