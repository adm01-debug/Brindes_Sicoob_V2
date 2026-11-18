CREATE OR REPLACE FUNCTION public.get_enum_values(enum_name text)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT COALESCE(array_agg(e.enumlabel::text ORDER BY e.enumsortorder), ARRAY[]::text[])
  FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
  JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname='public' AND t.typname=enum_name
$function$
