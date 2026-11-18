CREATE OR REPLACE FUNCTION public.fill_integration_credential_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.length := COALESCE(char_length(NEW.secret_value), 0);
  IF NEW.length >= 4 THEN
    NEW.masked_suffix := right(NEW.secret_value, 4);
  ELSE
    NEW.masked_suffix := NEW.secret_value;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
