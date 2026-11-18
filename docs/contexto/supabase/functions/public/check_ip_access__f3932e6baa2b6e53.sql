CREATE OR REPLACE FUNCTION public.check_ip_access(_ip text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _type TEXT;
BEGIN
  SELECT list_type INTO _type
  FROM public.ip_access_control
  WHERE ip_address = _ip
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  RETURN _type; -- returns 'allow', 'block', or NULL
END;
$function$
