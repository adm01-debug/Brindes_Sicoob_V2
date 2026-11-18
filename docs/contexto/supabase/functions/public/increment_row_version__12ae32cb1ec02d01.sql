CREATE OR REPLACE FUNCTION public.increment_row_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only bump version on actual data changes (not when only version itself was sent)
  IF TG_OP = 'UPDATE' AND OLD.version IS NOT DISTINCT FROM NEW.version THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$function$
