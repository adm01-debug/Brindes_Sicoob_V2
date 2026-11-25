CREATE OR REPLACE FUNCTION public.get_unread_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM notifications
    WHERE user_id = auth.uid()
      AND NOT is_read
  );
END;
$function$
