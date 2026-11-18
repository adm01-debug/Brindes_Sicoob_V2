CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_names text[])
 RETURNS TABLE(table_name text, rls_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT requested.name, COALESCE(c.relrowsecurity, false)
  FROM unnest(table_names) requested(name)
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=requested.name AND c.relkind IN ('r','p')
$function$
