-- Registra cada disparo do pg_net e materializa o resultado HTTP para que
-- falhas do cron não desapareçam no armazenamento temporário da extensão.
CREATE TABLE public.sicoob_approval_worker_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id bigint NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','succeeded','failed','timed_out')),
  status_code integer,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz
);
CREATE INDEX idx_sicoob_approval_worker_dispatch_state
  ON public.sicoob_approval_worker_dispatches(state,requested_at);
ALTER TABLE public.sicoob_approval_worker_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sicoob_approval_worker_dispatches FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sicoob_approval_worker_dispatches TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_sicoob_approval_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog,public,vault,net
AS $function$
DECLARE v_project_url text; v_worker_secret text; v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets
  WHERE name='sicoob_project_url' ORDER BY updated_at DESC LIMIT 1;
  SELECT decrypted_secret INTO v_worker_secret FROM vault.decrypted_secrets
  WHERE name='sicoob_approval_worker_secret' ORDER BY updated_at DESC LIMIT 1;
  v_project_url:=rtrim(COALESCE(v_project_url,''),'/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_worker_secret,'')) NOT BETWEEN 32 AND 512 THEN
    RAISE WARNING 'Worker de aprovações não configurado no Vault';
    RETURN NULL;
  END IF;
  SELECT net.http_post(
    url:=v_project_url||'/functions/v1/sicoob-approval-notifications',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_worker_secret),
    body:='{"action":"process_queue"}'::jsonb,timeout_milliseconds:=40000
  ) INTO v_request_id;
  INSERT INTO public.sicoob_approval_worker_dispatches(request_id) VALUES(v_request_id);
  RETURN v_request_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.dispatch_sicoob_approval_worker() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_approval_worker() TO service_role;

CREATE FUNCTION public.monitor_sicoob_approval_worker()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog,public,net
AS $function$
DECLARE v_failed bigint; v_queued bigint; v_oldest_seconds integer; v_pending_old bigint; v_unresolved bigint;
BEGIN
  UPDATE public.sicoob_approval_worker_dispatches d SET
    state=CASE WHEN r.timed_out IS TRUE THEN 'timed_out'
      WHEN r.error_msg IS NOT NULL OR r.status_code NOT BETWEEN 200 AND 299 THEN 'failed'
      ELSE 'succeeded' END,
    status_code=r.status_code,
    error_message=left(COALESCE(r.error_msg,r.content),1000),
    completed_at=COALESCE(r.created,clock_timestamp())
  FROM net._http_response r
  WHERE d.request_id=r.id AND d.state='queued';

  UPDATE public.sicoob_approval_worker_dispatches SET
    state='timed_out',error_message='Resposta do pg_net não observada em dois minutos',completed_at=clock_timestamp()
  WHERE state='queued' AND requested_at<clock_timestamp()-interval '2 minutes';

  DELETE FROM public.sicoob_approval_worker_dispatches
  WHERE requested_at<clock_timestamp()-interval '30 days';

  SELECT count(*) FILTER (WHERE state IN ('failed','timed_out')),
         count(*) FILTER (WHERE state='queued'),
         COALESCE(extract(epoch FROM clock_timestamp()-(min(requested_at) FILTER (WHERE state='queued'))),0)::integer
  INTO v_failed,v_queued,v_oldest_seconds
  FROM public.sicoob_approval_worker_dispatches
  WHERE requested_at>=clock_timestamp()-interval '24 hours';

  SELECT count(*) INTO v_pending_old FROM public.sicoob_approval_deliveries
  WHERE state IN ('pending','retry') AND available_at<clock_timestamp()-interval '5 minutes';
  SELECT count(*) INTO v_unresolved FROM public.sicoob_approval_deliveries
  WHERE state IN ('failed','uncertain') AND reconciliation IS NULL;
  RETURN jsonb_build_object(
    'failed_24h',v_failed,'queued',v_queued,'oldest_queued_seconds',v_oldest_seconds,
    'deliveries_delayed',v_pending_old,'unresolved_deliveries',v_unresolved,
    'healthy',v_failed=0 AND v_pending_old=0 AND v_unresolved=0
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.monitor_sicoob_approval_worker() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_sicoob_approval_worker() TO service_role;

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='sicoob-approval-outbox-monitor';
END;
$block$;
SELECT cron.schedule(
  'sicoob-approval-outbox-monitor','*/2 * * * *',
  $cron$SELECT public.monitor_sicoob_approval_worker();$cron$
);
