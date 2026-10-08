-- Remove duas agendas legadas que falham diariamente no banco canônico.
--
-- O log administrativo passou a ser particionado em 20260916120000, quando
-- `admin_audit_log_archive` foi removida. A função de arquivamento remanescente
-- ainda tentava gravar nessa tabela inexistente. Já a retenção do histórico de
-- conexões é feita pelo trigger AFTER INSERT; a chamada direta via pg_cron é
-- inválida porque a função retorna trigger e depende de NEW.

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'archive-old-admin-audit-logs',
  'trim-connection-test-history'
);

DROP FUNCTION IF EXISTS public.archive_old_admin_audit_logs();

DO $migration$
BEGIN
  IF to_regprocedure('public.trim_connection_test_history()') IS NULL THEN
    RAISE EXCEPTION 'Função de retenção trim_connection_test_history ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.connection_test_history'::regclass
      AND tgname = 'trg_trim_connection_test_history'
      AND NOT tgisinternal
      AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Trigger de retenção trg_trim_connection_test_history ausente ou desabilitado';
  END IF;
END
$migration$;

COMMENT ON FUNCTION public.trim_connection_test_history() IS
  'Mantém os 200 testes mais recentes por conexão; execução exclusiva pelo trigger trg_trim_connection_test_history.';
