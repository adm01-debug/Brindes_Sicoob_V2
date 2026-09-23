-- Substitui o cron legado, que apontava para outro projeto e usava uma chave
-- de serviço no texto do job. URL e segredo são lidos a cada disparo do Vault.
CREATE OR REPLACE FUNCTION public.dispatch_sicoob_export_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, net
AS $function$
DECLARE
  v_project_url text;
  v_internal_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_internal_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_internal_function_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_internal_secret, '')) NOT BETWEEN 32 AND 512 THEN
    RAISE WARNING 'Worker de exportações não configurado no Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/process-batch-export',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sicoob-internal-secret', v_internal_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 40000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_sicoob_export_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_export_worker() TO service_role;

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'process-export-queue';
END;
$block$;

SELECT cron.schedule(
  'process-export-queue',
  '* * * * *',
  $cron$SELECT public.dispatch_sicoob_export_worker();$cron$
);
