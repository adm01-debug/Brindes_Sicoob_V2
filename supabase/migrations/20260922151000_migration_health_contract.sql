-- Helpers de metadados exclusivos do servidor, sem SQL dinâmico.
CREATE OR REPLACE FUNCTION public.get_enum_values(enum_name text)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT COALESCE(array_agg(e.enumlabel::text ORDER BY e.enumsortorder), ARRAY[]::text[])
  FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
  JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname='public' AND t.typname=enum_name
$$;
CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_names text[])
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT requested.name, COALESCE(c.relrowsecurity, false)
  FROM unnest(table_names) requested(name)
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=requested.name AND c.relkind IN ('r','p')
$$;
REVOKE ALL ON FUNCTION public.get_enum_values(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rls_enabled(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_enum_values(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rls_enabled(text[]) TO service_role;
