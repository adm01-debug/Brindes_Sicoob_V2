CREATE OR REPLACE FUNCTION public.audit_actor_email(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND (
    auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM p_user_id
      AND NOT COALESCE(public.is_dev(auth.uid()), false))
  ) THEN RETURN NULL; END IF;
  RETURN (SELECT u.email::text FROM auth.users u WHERE u.id = p_user_id);
END; $function$
