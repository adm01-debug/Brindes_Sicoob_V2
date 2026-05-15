-- Updating INSERT policy to strictly require admin role to pass tests
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
        EXECUTE format('CREATE POLICY "Admins can insert audit logs" ON public.%I FOR INSERT WITH CHECK (public.has_role(auth.uid(), ''admin''));', t);
    END LOOP;
END $$;
