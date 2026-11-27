-- O preview do Supabase reaplica as migrations num banco persistente. Se
-- cleanup_old_notifications ja existir com RETURNS VOID (estado legado do
-- fix A-028), o CREATE OR REPLACE do arquivo 004 falha com SQLSTATE 42P13,
-- porque o PostgreSQL proibe trocar o tipo de retorno. O 004 ja esta
-- mesclado e nao pode ser editado (etapa 14 do plano), entao a correcao vem
-- numa migration nova.
--
-- O DROP so roda quando a assinatura esta errada: depois dele a funcao e
-- recriada nesta mesma migration, com o corpo identico ao do 004. Nunca
-- deixa o banco sem a funcao.
DO $fix_cleanup$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cleanup_old_notifications'
      AND pg_get_function_result(p.oid) <> 'integer'
  ) THEN
    DROP FUNCTION public.cleanup_old_notifications();
  END IF;
END;
$fix_cleanup$;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND is_read = true
    RETURNING *
  )
  SELECT COUNT(*)::INT INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
