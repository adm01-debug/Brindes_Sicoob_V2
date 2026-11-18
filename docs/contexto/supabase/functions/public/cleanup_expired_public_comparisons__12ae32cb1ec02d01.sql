CREATE OR REPLACE FUNCTION public.cleanup_expired_public_comparisons()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.user_comparisons
    SET is_public = false,
        share_token = NULL,
        share_expires_at = NULL
    WHERE is_public = true
      AND share_expires_at IS NOT NULL
      AND share_expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$function$
