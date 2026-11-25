-- =====================================================
-- Guarda de replay do bootstrap de notificacoes (A-028 / E-011)
-- =====================================================
-- 004_notification_functions.sql declara cleanup_old_notifications() RETURNS INT.
-- As migrations 20260301000000 e 20260312110229 fixaram a mesma assinatura como
-- RETURNS VOID, que e o estado de producao. Numa base que ja tem a versao VOID -- e o
-- caso do branch de preview do Supabase, criado a partir de producao -- o
-- CREATE OR REPLACE legado aborta com SQLSTATE 42P13 ("cannot change return type of
-- existing function") e o preview para de aplicar migrations.
--
-- Este arquivo tem versao 000, portanto roda ANTES de 004: remove a assinatura
-- conflitante para o bootstrap poder declarar a sua. O contrato final (VOID, nao exposta
-- a anon/authenticated) e reafirmado por 20261125100000_notification_functions_contract.sql.
--
-- Arquivo de bootstrap puro: pode ser removido quando o historico legado 00x sair.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cleanup_old_notifications'
      AND p.prorettype <> 'integer'::regtype
  ) THEN
    DROP FUNCTION public.cleanup_old_notifications();
  END IF;
END $$;
