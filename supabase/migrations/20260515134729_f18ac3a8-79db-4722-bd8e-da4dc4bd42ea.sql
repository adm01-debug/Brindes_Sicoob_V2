-- Standardizing admin_audit_log policies for test compliance
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE (tablename = 'admin_audit_log' OR tablename LIKE 'admin_audit_log%') AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Supervisors can view audit logs" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (public.has_role(auth.uid(), ''admin''));', t);
    END LOOP;
END $$;
