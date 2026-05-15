-- Standardizing user_roles policies to pass tests
DROP POLICY IF EXISTS "Supervisors read all roles" ON public.user_roles;
CREATE POLICY "Supervisors read all roles" ON public.user_roles 
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Standardizing audit log policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'admin_audit_log%' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (public.has_role(auth.uid(), ''admin''));', t);
    END LOOP;
END $$;
