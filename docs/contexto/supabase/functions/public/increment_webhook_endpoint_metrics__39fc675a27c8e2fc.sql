CREATE OR REPLACE FUNCTION public.increment_webhook_endpoint_metrics(p_id uuid, p_received_at timestamp with time zone, p_invalid boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inbound_webhook_endpoints
  SET
    last_received_at = p_received_at,
    total_received   = COALESCE(total_received, 0) + 1,
    total_invalid    = COALESCE(total_invalid,  0) + CASE WHEN p_invalid THEN 1 ELSE 0 END
  WHERE id = p_id;
END;
$function$
