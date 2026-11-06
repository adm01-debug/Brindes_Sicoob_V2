-- A-028: corrige erro 42P13 em replay do banco do zero.
-- 004_notification_functions.sql cria cleanup_old_notifications() RETURNS INT;
-- a migration 20260312110229_... tenta CREATE OR REPLACE ... RETURNS VOID,
-- o que o PostgreSQL proíbe sem DROP. Este arquivo roda ANTES (timestamp anterior)
-- e faz DROP + recria a função com RETURNS VOID, preservando permissões.

DROP FUNCTION IF EXISTS public.cleanup_old_notifications();

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO authenticated;
