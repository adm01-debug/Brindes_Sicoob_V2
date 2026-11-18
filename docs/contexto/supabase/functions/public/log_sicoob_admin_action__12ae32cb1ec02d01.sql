CREATE OR REPLACE FUNCTION public.log_sicoob_admin_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _actor_id uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  INSERT INTO public.admin_audit_log (
    action,
    resource_type,
    resource_id,
    user_id,
    details,
    source
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    _actor_id,
    jsonb_build_object('old', OLD, 'new', NEW),
    CASE WHEN auth.uid() IS NULL THEN 'database' ELSE 'user' END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
