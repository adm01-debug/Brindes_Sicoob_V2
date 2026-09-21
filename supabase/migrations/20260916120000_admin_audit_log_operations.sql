-- Reconciliação 16/09/2026 — operação do log de auditoria particionado
-- e agendamento de rotinas de limpeza que já existiam como funções mas
-- nunca tinham sido colocadas no pg_cron (cron.job estava vazio).
-- Registrado aqui como documentação as-built (já executado via SQL Editor).

-- 1) Remove tabelas legadas vazias e sem uso no código.
DROP TABLE IF EXISTS public.admin_audit_log_old;
DROP TABLE IF EXISTS public.admin_audit_log_archive;

-- 2) Cria partições até 2027-03 (paravam em 2026-06) e realoca linhas
--    que estavam presas na partição DEFAULT.
-- NOTA (achado pela validação pós-implementação): o teste original usava
-- 'public.admin_audit_log_y2026_m07'::regclass, que lança erro fatal
-- (relation does not exist) em vez de retornar NULL quando a partição
-- ainda não existe — quebraria esta migration num ambiente novo, antes
-- mesmo de avaliar a condição. to_regclass() é o equivalente seguro:
-- retorna NULL em vez de erro.
DO $$
BEGIN
  IF to_regclass('public.admin_audit_log_y2026_m07') IS NULL THEN
    CREATE TEMP TABLE _moved_audit_rows ON COMMIT DROP AS
      SELECT * FROM public.admin_audit_log_default;
    DELETE FROM public.admin_audit_log_default;

    CREATE TABLE public.admin_audit_log_y2026_m07
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    CREATE TABLE public.admin_audit_log_y2026_m08
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE public.admin_audit_log_y2026_m09
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE public.admin_audit_log_y2026_m10
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    CREATE TABLE public.admin_audit_log_y2026_m11
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
    CREATE TABLE public.admin_audit_log_y2026_m12
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
    CREATE TABLE public.admin_audit_log_y2027_m01
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
    CREATE TABLE public.admin_audit_log_y2027_m02
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
    CREATE TABLE public.admin_audit_log_y2027_m03
      PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

    INSERT INTO public.admin_audit_log SELECT * FROM _moved_audit_rows;
  END IF;
END
$$;

-- 3) Função + agendamento: garante sempre 3 meses de partição à frente.
CREATE OR REPLACE FUNCTION public.ensure_admin_audit_log_partitions(months_ahead integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date;
  v_name text;
BEGIN
  FOR i IN 0..months_ahead LOOP
    v_month := date_trunc('month', now())::date + (i || ' months')::interval;
    v_name := 'admin_audit_log_y' || to_char(v_month, 'YYYY') || '_m' || to_char(v_month, 'MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.admin_audit_log FOR VALUES FROM (%L) TO (%L)',
      v_name, v_month, v_month + interval '1 month'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_admin_audit_log_partitions(integer) FROM PUBLIC;

SELECT cron.schedule(
  'ensure-admin-audit-log-partitions', '0 3 1 * *',
  $$SELECT public.ensure_admin_audit_log_partitions(3)$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ensure-admin-audit-log-partitions');

-- 4) Agenda as rotinas de limpeza que já existiam como função SQL mas
--    nunca tinham sido colocadas no pg_cron.
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$SELECT public.cleanup_rate_limits()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-rate-limits');
SELECT cron.schedule('cleanup-expired-step-up', '*/15 * * * *', $$SELECT public.cleanup_expired_step_up()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-expired-step-up');
SELECT cron.schedule('archive-old-admin-audit-logs', '0 2 * * *', $$SELECT public.archive_old_admin_audit_logs()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='archive-old-admin-audit-logs');
SELECT cron.schedule('cleanup-expired-collection-trash', '0 3 * * *', $$SELECT public.cleanup_expired_collection_trash()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-expired-collection-trash');
SELECT cron.schedule('cleanup-expired-favorite-trash', '10 3 * * *', $$SELECT public.cleanup_expired_favorite_trash()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-expired-favorite-trash');
SELECT cron.schedule('cleanup-expired-public-comparisons', '20 3 * * *', $$SELECT public.cleanup_expired_public_comparisons()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-expired-public-comparisons');
SELECT cron.schedule('cleanup-old-notifications', '30 3 * * *', $$SELECT public.cleanup_old_notifications()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-old-notifications');
SELECT cron.schedule('cleanup-security-logs', '40 3 * * *', $$SELECT public.cleanup_security_logs()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-security-logs');
SELECT cron.schedule('cleanup-webhook-logs', '50 3 * * *', $$SELECT public.cleanup_webhook_logs()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-webhook-logs');
SELECT cron.schedule('trim-connection-test-history', '0 4 * * *', $$SELECT public.trim_connection_test_history()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='trim-connection-test-history');
SELECT cron.schedule('cleanup-discount-test-data', '10 4 * * *', $$SELECT public.cleanup_discount_test_data()$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-discount-test-data');
