CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _token_failures_deleted int := 0;
  _bot_log_deleted int := 0;
  _audit_log_deleted int := 0;
  _ip_expired_deleted int := 0;
BEGIN
  WITH d AS (DELETE FROM public.public_token_failures WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _token_failures_deleted FROM d;

  WITH d AS (DELETE FROM public.bot_detection_log WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _bot_log_deleted FROM d;

  WITH d AS (DELETE FROM public.admin_audit_log WHERE created_at < now() - INTERVAL '365 days' RETURNING 1)
  SELECT count(*) INTO _audit_log_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ip_access_control
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _ip_expired_deleted FROM d;

  RETURN jsonb_build_object(
    'ok', true,
    'ran_at', now(),
    'public_token_failures_deleted', _token_failures_deleted,
    'bot_detection_log_deleted', _bot_log_deleted,
    'admin_audit_log_deleted', _audit_log_deleted,
    'ip_access_control_expired_deleted', _ip_expired_deleted
  );
END;
$function$
