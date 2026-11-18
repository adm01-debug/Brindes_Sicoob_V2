CREATE OR REPLACE FUNCTION public.generate_secure_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate a cryptographically secure 32-byte hex token
  NEW.token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$function$
