CREATE OR REPLACE FUNCTION public.validate_discount_approval_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid discount approval status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$
