CREATE OR REPLACE FUNCTION public.assert_database_auditor()
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND (
    auth.uid() IS NULL OR NOT (COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
      OR COALESCE(public.has_role(auth.uid(), 'dev'::public.app_role), false))
  ) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Auditoria restrita à administração.'; END IF;
END; $function$
