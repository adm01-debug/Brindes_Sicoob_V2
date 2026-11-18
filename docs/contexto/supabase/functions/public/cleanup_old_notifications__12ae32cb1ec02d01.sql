CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.workspace_notifications
  WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
END;
$function$
