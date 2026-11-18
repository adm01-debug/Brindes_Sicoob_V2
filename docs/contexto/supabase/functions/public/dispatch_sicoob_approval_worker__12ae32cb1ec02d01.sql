CREATE OR REPLACE FUNCTION public.dispatch_sicoob_approval_worker()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'net'
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
$function$
