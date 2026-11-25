CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE user_id = auth.uid()
    AND NOT is_read;
END;
$function$
