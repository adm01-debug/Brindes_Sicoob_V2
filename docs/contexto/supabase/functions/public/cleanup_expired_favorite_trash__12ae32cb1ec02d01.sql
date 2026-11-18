CREATE OR REPLACE FUNCTION public.cleanup_expired_favorite_trash()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.favorite_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$function$
