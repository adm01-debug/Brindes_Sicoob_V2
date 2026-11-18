CREATE OR REPLACE FUNCTION public.normalize_search_analytics_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NOT NULL THEN
    NEW.user_id := v_actor;
    NEW.seller_id := v_actor;
  END IF;

  NEW.search_term := left(btrim(NEW.search_term), 500);

  IF NEW.search_context IS NULL AND NEW.filters_used IS NOT NULL THEN
    NEW.search_context := NEW.filters_used::text;
  END IF;

  RETURN NEW;
END
$function$
