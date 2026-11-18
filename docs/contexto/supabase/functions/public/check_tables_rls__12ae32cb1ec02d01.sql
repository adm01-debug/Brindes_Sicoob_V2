CREATE OR REPLACE FUNCTION public.check_tables_rls()
 RETURNS TABLE(schemaname text, relname text, relrowsecurity boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  PERFORM public.assert_database_auditor();
  RETURN QUERY SELECT n.nspname::text, c.relname::text, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname;
END; $function$
