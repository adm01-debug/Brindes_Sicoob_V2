-- Tabelas internas (acesso exclusivo por service_role via BYPASSRLS).
-- RLS habilitado sem policies ativa negação implícita para anon/authenticated,
-- mas audit_empty_rls_policies() exige pelo menos uma policy explícita.
-- RESTRICTIVE USING (false) documenta a intenção e satisfaz o scanner sem
-- bloquear service_role (que ignora policies por ter BYPASSRLS).

CREATE POLICY deny_non_service_role ON public.bitrix_clients
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.bitrix_deals
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.bitrix_sync_logs
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.order_duplicate_requests
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.quote_approval_evidence_keys
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.sicoob_approval_deliveries
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.sicoob_approval_delivery_archive
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.sicoob_approval_worker_dispatches
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.webhook_configs
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
