CREATE OR REPLACE FUNCTION public.check_tables_rls()
RETURNS TABLE (
    schemaname text,
    relname text,
    relrowsecurity boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
