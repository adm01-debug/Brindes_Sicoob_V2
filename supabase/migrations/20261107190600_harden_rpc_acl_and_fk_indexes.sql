-- Hardening de ACL de RPC e índices de FK (auditoria banco — session
-- claude/infra-hardening-sql-261107-1902)
--
-- Gaps corrigidos pela auditoria:
-- 1. public.process_export_queue_v3() está acessível a anon/authenticated/PUBLIC
--    no banco atual (drift). A função é um STUB sem chamador real
--    (docs/execucao/evidencias/funcoes_orfas_20260917.md, DB-34); gravar
--    export_jobs a partir do cliente abre vetor de escrita indevida.
--    Só service_role (cron/edge functions) executa via owner.
-- 2. public.get_webhook_delivery_summary(INT) voltou a ser executável por
--    anon/PUBLIC (drift: a migration 20260427122230 já tinha revogado). A
--    função expõe telemetria de deliveries a não autenticados.
-- 3. Três FKs sem índice (catalog_marketing_terms.created_by/updated_by,
--    catalog_product_marketing.created_by) — scans de FK deletes/lookups
--    varrem tabelas grandes sem índice.
--
-- Revogações são idempotentes (no-op se o grant não existir); CREATE INDEX
-- IF NOT EXISTS também. Sem DROP destrutivo. Índices duplicados detectados
-- (idx_* redundantes com UNIQUE) NÃO são removidos: exigiria DROP INDEX,
-- fora do escopo aditivo desta migration.

-- ---------------------------------------------------------------------------
-- 1. process_export_queue_v3(): fechar EXECUTE para clients
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.process_export_queue_v3() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_export_queue_v3() FROM anon;
REVOKE ALL ON FUNCTION public.process_export_queue_v3() FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. get_webhook_delivery_summary(INT): restaurar intenção original
--    (só authenticated + service_role; não expor telemetria a anon)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_webhook_delivery_summary(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_webhook_delivery_summary(INT) FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Índices para FKs sem índice (aditivo)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalog_marketing_terms_created_by
  ON public.catalog_marketing_terms (created_by);
CREATE INDEX IF NOT EXISTS idx_catalog_marketing_terms_updated_by
  ON public.catalog_marketing_terms (updated_by);
CREATE INDEX IF NOT EXISTS idx_catalog_product_marketing_created_by
  ON public.catalog_product_marketing (created_by);