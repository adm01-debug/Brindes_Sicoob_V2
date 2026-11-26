-- =====================================================
-- Contrato final de cleanup_old_notifications (A-028 / E-011)
-- =====================================================
-- O bootstrap legado (004_notification_functions.sql) declara esta funcao como
-- RETURNS INT; a evolucao (20260301000000, 20260312110229) fixou RETURNS VOID, que e o
-- que existe em producao e o que o cron `cleanup-old-notifications` consome
-- (20260916120000_admin_audit_log_operations.sql:92, SELECT sem uso do retorno).
--
-- Em replay, 000_notification_functions_replay_guard.sql deixa o bootstrap declarar a
-- versao contadora; esta migration devolve o resultado final ao contrato de producao.
-- Em producao a funcao ja e VOID, entao o bloco nao faz nada e so restam os
-- REVOKE/GRANT, idempotentes.
--
-- Tres estados possiveis ao chegar aqui:
--   VOID  -> contrato satisfeito, nada e recriado (ACL de producao preservado)
--   INT   -> replay: DROP + recria como VOID
--   ausente -> a guarda rodou sobre producao (onde 004 ja estava aplicado) e nada
--              recriou a funcao: recria com o corpo identico a 20260301000000
DO $$
DECLARE
  v_existe BOOLEAN := FALSE;
  v_eh_void BOOLEAN := FALSE;
BEGIN
  SELECT TRUE, p.prorettype = 'void'::regtype
    INTO v_existe, v_eh_void
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'cleanup_old_notifications'
  LIMIT 1;

  IF v_existe AND v_eh_void THEN
    RETURN;
  END IF;

  IF v_existe THEN
    DROP FUNCTION public.cleanup_old_notifications();
  END IF;

  CREATE FUNCTION public.cleanup_old_notifications()
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
  END;
  $fn$;
END $$;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;
