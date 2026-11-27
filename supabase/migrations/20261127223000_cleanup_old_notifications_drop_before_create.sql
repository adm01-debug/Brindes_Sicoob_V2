-- O preview do Supabase reaplica as migrations num banco persistente. Se
-- cleanup_old_notifications ja existir com RETURNS VOID (estado legado do
-- fix A-028), o CREATE OR REPLACE do arquivo 004 falha com SQLSTATE 42P13,
-- porque o PostgreSQL proibe trocar o tipo de retorno. O 004 ja esta
-- mesclado e nao pode ser editado (etapa 14 do plano), entao a correcao vem
-- numa migration nova.
--
-- O DROP so roda quando a assinatura ainda e a antiga (INTEGER). Depois dele
-- a funcao e recriada nesta mesma migration, com a assinatura VIGENTE
-- estabelecida por 20261125100000_notification_functions_contract.sql:
-- RETURNS VOID, SECURITY DEFINER, SET search_path = public e a mesma ACL.
-- Nunca deixa o banco sem a funcao.
DO $fix_cleanup$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cleanup_old_notifications'
      AND p.pronargs = 0
      AND pg_get_function_result(p.oid) <> 'void'
  ) THEN
    DROP FUNCTION public.cleanup_old_notifications();
  END IF;

  IF to_regprocedure('public.cleanup_old_notifications()') IS NULL THEN
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
  END IF;
END;
$fix_cleanup$;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;