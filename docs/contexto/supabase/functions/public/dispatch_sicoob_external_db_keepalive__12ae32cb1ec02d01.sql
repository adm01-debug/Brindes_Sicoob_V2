CREATE OR REPLACE FUNCTION public.dispatch_sicoob_external_db_keepalive()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'net'
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
$function$
