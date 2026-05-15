-- Adding INSERT policy to admin_audit_log to satisfy tests
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE (tablename = 'admin_audit_log' OR tablename LIKE 'admin_audit_log%') AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "System can insert audit logs" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "System can insert audit logs" ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'');', t);
    END LOOP;
END $$;
