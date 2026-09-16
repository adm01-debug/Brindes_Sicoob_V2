-- Reconciliação 16/09/2026 — endurecimento de segurança aplicado em produção.
-- Registrado aqui como documentação as-built (já executado via SQL Editor).

-- 1) RLS em tabelas que estavam completamente abertas para anon/authenticated.
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_notification_templates" ON public.notification_templates;
CREATE POLICY "admin_read_notification_templates" ON public.notification_templates
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);

DROP POLICY IF EXISTS "admin_read_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_read_webhook_logs" ON public.webhook_logs
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);
-- webhook_configs: nenhuma policy de proposito (deny-all para anon/authenticated;
-- tabela sem nenhuma referencia no codigo cliente).

-- 2) Tabelas com RLS ligado mas 0 policies — bug funcional, nao so seguranca:
--    quebrava o painel de seguranca de acesso e a assinatura realtime de
--    notificacao de novo dispositivo.
DROP POLICY IF EXISTS "admin_manage_access_security_settings" ON public.access_security_settings;
CREATE POLICY "admin_manage_access_security_settings" ON public.access_security_settings
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin','dev'))
);

DROP POLICY IF EXISTS "user_read_own_device_login_notifications" ON public.device_login_notifications;
CREATE POLICY "user_read_own_device_login_notifications" ON public.device_login_notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3) search_path faltante na unica SECURITY DEFINER que nao tinha.
ALTER FUNCTION public.log_sicoob_admin_action() SET search_path = public;

-- 4) Duas policies abertas demais fechadas para exigir login (decisao do
--    usuario): notifications aceitava INSERT de qualquer visitante anonimo;
--    price_history expunha historico de precos publicamente.
DROP POLICY IF EXISTS "Systems can create notifications" ON public.notifications;
CREATE POLICY "authenticated_create_notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anyone_read_price_history" ON public.price_history;
CREATE POLICY "authenticated_read_price_history" ON public.price_history
FOR SELECT TO authenticated USING (true);

-- 5) ACL de funcoes SECURITY DEFINER: 177/203 estavam com EXECUTE liberado
--    para PUBLIC (inclui anonimo). Duas eram vulnerabilidades criticas:
--    inspect_query_plan executava SQL arbitrario via EXPLAIN sem nenhuma
--    autenticacao; cleanup_test_auth_orphans deletava qualquer usuario de
--    auth.users sem checagem. As demais sao rotinas internas/cron/teste
--    sem uso legitimo por cliente.
REVOKE ALL ON FUNCTION public.inspect_query_plan(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_test_auth_orphans(uuid[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.archive_old_admin_audit_logs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_all_rls_compliance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_sicoob_rls_policies() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_block_extreme_offenders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_revoke_orphan_full_keys(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_discount_test_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_collection_trash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_favorite_trash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_public_comparisons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_step_up() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_security_logs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_webhook_logs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_hardening_regression() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.snapshot_hardening_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_external_connections_from_credentials() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_discount_test_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_qa_scenario(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_qa_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_test_auth_integrity(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_mcp_access_violation(uuid, text, text, text, uuid, text, text, text, jsonb) FROM PUBLIC;

-- Recursos reais do app: exigem login (authenticated), mas nao devem
-- ficar abertos a visitante anonimo.
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_default_favorite_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_favorite_list(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_sicoob_performance_report(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_sicoob_performance_report(text, text) TO authenticated;
