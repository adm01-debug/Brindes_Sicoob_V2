CREATE OR REPLACE FUNCTION public.check_migration_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  roles text[];
  rls_status jsonb;
BEGIN
  -- Get roles
  SELECT array_agg(enumlabel) INTO roles 
  FROM pg_enum 
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
  WHERE pg_type.typname = 'app_role';

  -- Get RLS status
  SELECT jsonb_object_agg(relname, relrowsecurity) INTO rls_status
  FROM pg_class
  JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public'
    AND relname IN ('cooperativas', 'postos_atendimento', 'cooperativa_budgets', 'pa_budgets');

  RETURN jsonb_build_object(
    'roles', roles,
    'rls_status', rls_status
  );
END;
$function$
