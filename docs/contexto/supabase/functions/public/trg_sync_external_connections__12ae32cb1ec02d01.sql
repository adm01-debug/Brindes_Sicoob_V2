CREATE OR REPLACE FUNCTION public.trg_sync_external_connections()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _secret_name text;
  _op text := TG_OP;
BEGIN
  _secret_name := COALESCE(NEW.secret_name, OLD.secret_name);
  IF (TG_OP = 'DELETE' AND OLD.secret_name LIKE 'EXTERNAL_%')
     OR (TG_OP IN ('INSERT','UPDATE') AND NEW.secret_name LIKE 'EXTERNAL_%') THEN
    PERFORM public.sync_external_connections_from_credentials(
      _secret_name, _op, auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$function$
