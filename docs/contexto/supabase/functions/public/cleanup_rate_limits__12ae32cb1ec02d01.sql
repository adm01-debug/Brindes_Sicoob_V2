CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.request_rate_limits
  WHERE updated_at < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  DELETE FROM public.bot_detection_log
  WHERE created_at < now() - INTERVAL '30 days';
END;
$function$
