-- Hardening log_order_audit_event
ALTER FUNCTION public.log_order_audit_event(uuid, text, text, jsonb, uuid, text, text, text) SET search_path = public;

-- Audit logs RLS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'admin_audit_log%' AND schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (public.is_supervisor_or_above(auth.uid()));', t);
    END LOOP;
END $$;
