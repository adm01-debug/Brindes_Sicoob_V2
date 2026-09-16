-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Fase 4: segurança (RLS) — 3 tabelas sem RLS + 2 sem policy + 1 função
-- Gerado em 16/09/2026
-- ============================================================
BEGIN;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_notification_templates" ON public.notification_templates
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);

CREATE POLICY "admin_read_webhook_logs" ON public.webhook_logs
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);

CREATE POLICY "admin_manage_access_security_settings" ON public.access_security_settings
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);

CREATE POLICY "user_read_own_device_login_notifications" ON public.device_login_notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER FUNCTION public.log_sicoob_admin_action() SET search_path = public;

COMMIT;

-- ============================================================
-- VERIFICACAO — rode depois do COMMIT acima
-- ============================================================
select tablename, rowsecurity as rls_ligado
from pg_tables where schemaname='public'
and tablename in ('notification_templates','webhook_configs','webhook_logs')
order by 1;

select tablename, count(*) as policies
from pg_policies where schemaname='public'
and tablename in ('access_security_settings','device_login_notifications','notification_templates','webhook_logs')
group by 1 order by 1;
