CREATE OR REPLACE FUNCTION public.cleanup_expired_collection_trash()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.collection_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$function$
