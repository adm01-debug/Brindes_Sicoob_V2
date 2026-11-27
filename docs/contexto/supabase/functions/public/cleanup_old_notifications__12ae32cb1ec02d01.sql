CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND is_read = true
    RETURNING *
  )
  SELECT COUNT(*)::INT INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$function$
