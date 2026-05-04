CREATE OR REPLACE FUNCTION public.check_tables_rls()
RETURNS TABLE (
    schemaname text,
    relname text,
    relrowsecurity boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.nspname::text as schemaname,
        c.relname::text as relname,
        c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r' -- regular tables only
    ORDER BY n.nspname, c.relname;
END;
$$;

-- Permite que apenas autenticados (ou service role) chamem, mas a função é SECURITY DEFINER
-- Idealmente restrito a admins via app ou apenas via backend.
GRANT EXECUTE ON FUNCTION public.check_tables_rls() TO service_role;
