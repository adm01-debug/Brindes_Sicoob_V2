-- Reconciliação 16/09/2026 — endurecimento de segurança aplicado em produção.
-- Registrado aqui como documentação as-built (já executado via SQL Editor).
--
-- ATENÇÃO (revisão pós-validação por agentes especializados): a primeira
-- versão deste arquivo usava `REVOKE ALL ... FROM PUBLIC`. Nesse projeto
-- Supabase, novas funções recebem GRANT EXECUTE explícito e direto para
-- anon/authenticated/service_role na criação — não dependem do papel
-- PUBLIC. `REVOKE ... FROM PUBLIC` não remove esse grant direto, então a
-- primeira tentativa NÃO teve efeito real (confirmado com
-- has_function_privilege('anon', ...)). Esta versão revoga explicitamente
-- de `anon`/`authenticated` por nome. As migrations originais do Sicoob
-- (20260912170000, 20260912200000, 20260912180000 e seus follow-ups) têm
-- o mesmo padrão para as RPCs de service_role — corrigido aqui também,
-- já que ele permitia falsificação de identidade (as RPCs recebem
-- p_actor_id como parâmetro, não derivam de auth.uid()).

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
--    (direto, nao via PUBLIC) para anon. Duas eram vulnerabilidades
--    criticas: inspect_query_plan executava SQL arbitrario via EXPLAIN sem
--    nenhuma autenticacao; cleanup_test_auth_orphans deletava qualquer
--    usuario de auth.users sem checagem. As demais sao rotinas internas/
--    cron/teste sem uso legitimo por cliente. Revogado explicitamente de
--    anon E authenticated (nao bastava revogar de PUBLIC — ver nota acima).
REVOKE EXECUTE ON FUNCTION public.inspect_query_plan(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_test_auth_orphans(uuid[]) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.archive_old_admin_audit_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_all_rls_compliance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_sicoob_rls_policies() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_block_extreme_offenders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_revoke_orphan_full_keys(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_discount_test_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_collection_trash() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_favorite_trash() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_public_comparisons() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_step_up() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_security_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_webhook_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_hardening_regression() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_hardening_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_discount_test_users() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_qa_accounts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_test_auth_integrity(text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_mcp_access_violation(uuid, text, text, text, uuid, text, text, text, jsonb) FROM anon, authenticated;

-- Achadas em uso real pelo frontend autenticado (painel admin de conexões
-- e ferramenta de QA) — tira de anon, mantem/restaura authenticated.
REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_external_connections_from_credentials() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_qa_scenario(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_qa_scenario(text) TO authenticated;

-- Recursos reais do app — precisam de login (authenticated), mas nao devem
-- ficar abertos a visitante anonimo.
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_default_favorite_list(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_favorite_list(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_sicoob_performance_report(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_sicoob_performance_report(text, text) TO authenticated;

-- 6) RPCs Sicoob de service_role que recebem p_actor_id como parametro
--    explicito (nao usam auth.uid() internamente): se anon/authenticated
--    pudessem chamar direto, davam pra forjar identidade de outro usuario.
--    As migrations originais so faziam REVOKE FROM PUBLIC (insuficiente).
REVOKE EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_sicoob_order_artwork_version(uuid, uuid, text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sicoob_reorder_idempotency(uuid, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sicoob_kit_quote_idempotency(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_admin_audit_log_partitions(integer) FROM anon, authenticated;

-- 7) Consistência de ON DELETE entre tabelas irmãs do mesmo pedido Sicoob:
--    sicoob_order_shipments usava CASCADE enquanto invoices/payments/
--    artwork (mesma referência a sicoob_orders) usam RESTRICT — um pedido
--    com remessa registrada mas sem NF/pagamento/arte podia ser deletado
--    apagando silenciosamente o histórico de entrega.
ALTER TABLE public.sicoob_order_shipments
  DROP CONSTRAINT IF EXISTS sicoob_order_shipments_order_id_fkey,
  ADD CONSTRAINT sicoob_order_shipments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT;
