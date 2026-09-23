-- Substitui os dois agendamentos legados que deixavam destino e, no caso do
-- auto-teste, uma credencial diretamente no comando do pg_cron. O histórico
-- das migrations antigas é preservado; apenas os jobs ativos são recriados.

CREATE OR REPLACE FUNCTION public.dispatch_sicoob_connections_auto_test()
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
    RAISE WARNING 'Auto-teste de conexões não configurado no Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/connections-auto-test',
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

CREATE OR REPLACE FUNCTION public.dispatch_sicoob_external_db_keepalive()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, net
AS $function$
DECLARE
  v_project_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$' THEN
    RAISE WARNING 'Keep-alive do catálogo externo não configurado no Vault';
    RETURN NULL;
  END IF;

  -- O endpoint ping é explicitamente público e não acessa banco externo.
  SELECT net.http_post(
    url := v_project_url || '/functions/v1/external-db-bridge',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"operation":"ping"}'::jsonb,
    timeout_milliseconds := 5000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_sicoob_connections_auto_test() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_sicoob_external_db_keepalive() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_connections_auto_test() TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_external_db_keepalive() TO service_role;

DO $block$
DECLARE
  v_project_url text;
  v_internal_secret text;
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('connections-auto-test', 'external-db-bridge-keepalive');

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
  IF v_project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co$' THEN
    PERFORM cron.schedule(
      'external-db-bridge-keepalive',
      '*/4 * * * *',
      $cron$SELECT public.dispatch_sicoob_external_db_keepalive();$cron$
    );
  ELSE
    RAISE NOTICE 'Keep-alive do catálogo externo não agendado: Vault ainda não configurado';
  END IF;

  IF v_project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     AND length(COALESCE(v_internal_secret, '')) BETWEEN 32 AND 512 THEN
    PERFORM cron.schedule(
      'connections-auto-test',
      '*/15 * * * *',
      $cron$SELECT public.dispatch_sicoob_connections_auto_test();$cron$
    );
  ELSE
    RAISE NOTICE 'Auto-teste de conexões não agendado: Vault ainda não configurado';
  END IF;
END;
$block$;
