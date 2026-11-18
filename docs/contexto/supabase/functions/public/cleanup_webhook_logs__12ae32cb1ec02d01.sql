CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_deleted_outbound integer;
  v_deleted_inbound integer;
  v_deleted_retry_claims integer;
BEGIN
  DELETE FROM public.webhook_deliveries
  WHERE delivered_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_outbound = ROW_COUNT;

  DELETE FROM public.inbound_webhook_events
  WHERE received_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_inbound = ROW_COUNT;

  DELETE FROM public.webhook_retry_claims
  WHERE claimed_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_retry_claims = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'deleted_retry_claims', v_deleted_retry_claims,
    'ran_at', now()
  );
END;
$function$
