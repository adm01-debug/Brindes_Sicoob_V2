CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$function$
