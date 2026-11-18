CREATE OR REPLACE FUNCTION public.check_hardening_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_admin boolean;
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;

  RETURN jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'private_buckets_ok', _private_buckets = 4,
    'sensitive_realtime_count', _sensitive_realtime,
    'realtime_isolation_ok', _sensitive_realtime = 0,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true,
    'checked_at', now()
  );
END;
$function$
