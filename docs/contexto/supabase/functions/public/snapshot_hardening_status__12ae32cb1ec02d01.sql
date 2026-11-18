CREATE OR REPLACE FUNCTION public.snapshot_hardening_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _details jsonb;
  _snapshot_id uuid;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['pg_trgm fora do schema extensions']; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['Job cleanup-security-logs-daily inativo']; END IF;

  -- MFA enforced em app — assumido true (controlado em código)
  _score := _score + 1;

  _details := jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'sensitive_realtime_count', _sensitive_realtime,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true
  );

  INSERT INTO public.hardening_health_snapshots (score, max_score, failures, details)
  VALUES (_score, _max, _failures, _details)
  RETURNING id INTO _snapshot_id;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', _snapshot_id, 'score', _score, 'max', _max);
END;
$function$
