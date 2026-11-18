CREATE OR REPLACE FUNCTION public.sync_is_active_with_deleted_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.is_active = FALSE;
  END IF;
  RETURN NEW;
END;
$function$
