-- Compliance RLS scan (scripts/scan-rls-security.mjs): tabelas internas sem policy explícita.
-- audit_empty_rls_policies() exige pelo menos uma policy por tabela pública; sem policy o
-- job "Enterprise Compliance & Audit Reporting" falha em TODA run de main.
--
-- _backup_custom_kits_pinned_20261118: backup pontual do estado is_pinned antes da
-- normalização (20261118130400_pin_custom_kit_atomically). Leitura exclusiva por
-- superusuário/owner; REVOKE ALL já aplicado. Resta apenas documentar a intenção com
-- policy RESTRICTIVE (service_role ignora policies por ter BYPASSRLS).
--
-- webhook_retry_claims: resenha durável de tentativas do webhook-dispatcher, acessada
-- somente por funções SECURITY DEFINER (retry_failed_webhook_deliveries,
-- cleanup_webhook_logs). REVOKE ALL já aplicado; nenhuma edge function lê a tabela via REST.
--
-- Padrão idêntico a 20260928140600_rls_deny_all_internal_tables.sql, que usa o mesmo
-- nome de policy para as tabelas internas equivalentes.

CREATE POLICY deny_non_service_role ON public._backup_custom_kits_pinned_20261118
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

CREATE POLICY deny_non_service_role ON public.webhook_retry_claims
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
