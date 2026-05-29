-- Fix search_path for remaining functions with exact signatures
ALTER FUNCTION public.get_unread_count() SET search_path = public;
ALTER FUNCTION public.archive_old_admin_audit_logs() SET search_path = public;
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = public;
ALTER FUNCTION public.cleanup_webhook_logs() SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limits() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_public_comparisons() SET search_path = public;
ALTER FUNCTION public.provision_qa_accounts() SET search_path = public;
ALTER FUNCTION public.check_migration_status() SET search_path = public;
ALTER FUNCTION public.validate_ip_access_control() SET search_path = public;
ALTER FUNCTION public.snapshot_hardening_status() SET search_path = public;
ALTER FUNCTION public.audit_mcp_key_revoke() SET search_path = public;
ALTER FUNCTION public.is_dnd_active() SET search_path = public;
ALTER FUNCTION public.enforce_seller_id_owner() SET search_path = public;
ALTER FUNCTION public.current_user_cooperativa_id() SET search_path = public;
ALTER FUNCTION public.process_export_queue_v3() SET search_path = public;
ALTER FUNCTION public.get_connections_auto_test_interval() SET search_path = public;
ALTER FUNCTION public.validate_main_order_status_transition() SET search_path = public;
ALTER FUNCTION public.notify_discount_approval_request() SET search_path = public;
ALTER FUNCTION public.set_quote_hierarchy() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_favorite_trash() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.get_user_cooperative_id() SET search_path = public;
ALTER FUNCTION public.audit_user_role_changes() SET search_path = public;
ALTER FUNCTION public.cleanup_discount_test_data() SET search_path = public;
ALTER FUNCTION public.check_hardening_status() SET search_path = public;
ALTER FUNCTION public.check_telemetry_regression() SET search_path = public;
ALTER FUNCTION public.set_optimization_queue_updated_at() SET search_path = public;
ALTER FUNCTION public.notify_quote_status_change() SET search_path = public;
ALTER FUNCTION public.retry_failed_webhook_deliveries() SET search_path = public;

-- Fix RBAC with defaults
ALTER FUNCTION public.is_dev(uuid) SET search_path = public;
ALTER FUNCTION public.is_gerente_pa(uuid) SET search_path = public;
ALTER FUNCTION public.is_supervisor_or_above(uuid) SET search_path = public;
ALTER FUNCTION public.is_gestor_compras(uuid) SET search_path = public;
ALTER FUNCTION public.is_vendedor(uuid) SET search_path = public;
ALTER FUNCTION public.is_seller_only(uuid) SET search_path = public;

-- Telemetry Security
ALTER TABLE IF EXISTS public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telemetry_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Telemetry Events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telemetry_events' AND policyname = 'Authenticated users can insert telemetry events') THEN
        CREATE POLICY "Authenticated users can insert telemetry events" ON public.telemetry_events FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telemetry_events' AND policyname = 'Admins can view all telemetry events') THEN
        CREATE POLICY "Admins can view all telemetry events" ON public.telemetry_events FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));
    END IF;

    -- Telemetry Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telemetry_logs' AND policyname = 'Users can insert their own logs') THEN
        CREATE POLICY "Users can insert their own logs" ON public.telemetry_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telemetry_logs' AND policyname = 'Users can view their own logs') THEN
        CREATE POLICY "Users can view their own logs" ON public.telemetry_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

GRANT ALL ON public.telemetry_events TO service_role;
GRANT ALL ON public.telemetry_logs TO service_role;
GRANT INSERT, SELECT ON public.telemetry_events TO authenticated;
GRANT INSERT, SELECT ON public.telemetry_logs TO authenticated;
