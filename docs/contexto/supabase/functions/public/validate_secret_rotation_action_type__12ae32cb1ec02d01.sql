CREATE OR REPLACE FUNCTION public.validate_secret_rotation_action_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.action_type NOT IN ('set', 'rotate') THEN
    RAISE EXCEPTION 'Invalid action_type: must be set or rotate';
  END IF;
  RETURN NEW;
END;
$function$
