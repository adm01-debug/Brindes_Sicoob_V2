-- Drena a outbox a cada minuto. URL e credencial ficam no Vault e nunca são
-- persistidas no texto do job. Enquanto os dois segredos não existirem, a
-- função retorna NULL e emite WARNING sem fazer requisição externa.
CREATE OR REPLACE FUNCTION public.dispatch_sicoob_approval_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, net
AS $function$
DECLARE
  v_project_url text;
  v_worker_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_worker_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_approval_worker_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_worker_secret, '')) NOT BETWEEN 32 AND 512 THEN
    RAISE WARNING 'Worker de aprovações não configurado no Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/sicoob-approval-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_worker_secret
    ),
    body := '{"action":"process_queue"}'::jsonb,
    timeout_milliseconds := 40000
  ) INTO v_request_id;
  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_sicoob_approval_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_approval_worker() TO service_role;

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'sicoob-approval-outbox-worker';
END;
$block$;

SELECT cron.schedule(
  'sicoob-approval-outbox-worker',
  '* * * * *',
  $cron$SELECT public.dispatch_sicoob_approval_worker();$cron$
);
