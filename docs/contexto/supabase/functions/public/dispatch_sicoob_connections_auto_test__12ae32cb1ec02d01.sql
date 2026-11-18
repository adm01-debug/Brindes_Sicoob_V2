CREATE OR REPLACE FUNCTION public.dispatch_sicoob_connections_auto_test()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'net'
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
$function$
