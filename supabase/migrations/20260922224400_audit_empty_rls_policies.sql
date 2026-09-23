CREATE OR REPLACE FUNCTION public.audit_empty_rls_policies()
RETURNS TABLE(table_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  PERFORM public.assert_database_auditor();
  RETURN QUERY
  SELECT c.relname::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
  ORDER BY c.relname;
END;
$function$;

REVOKE ALL ON FUNCTION public.audit_empty_rls_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_empty_rls_policies() TO service_role;
