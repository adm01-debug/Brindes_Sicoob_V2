CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_email IS NULL OR NEW.email_to != user_email THEN
    RAISE EXCEPTION 'email_to must match your registered email address';
  END IF;

  RETURN NEW;
END;
$function$
