CREATE OR REPLACE FUNCTION public.validate_ip_access_control()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.list_type NOT IN ('allow', 'block') THEN
    RAISE EXCEPTION 'Invalid list_type: must be allow or block';
  END IF;
  RETURN NEW;
END;
$function$
