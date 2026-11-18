CREATE OR REPLACE FUNCTION public.get_unread_count()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_val
  FROM public.workspace_notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
  RETURN count_val;
END;
$function$
