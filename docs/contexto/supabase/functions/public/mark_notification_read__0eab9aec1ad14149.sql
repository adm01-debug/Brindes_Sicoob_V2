CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.workspace_notifications
  SET is_read = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$function$
