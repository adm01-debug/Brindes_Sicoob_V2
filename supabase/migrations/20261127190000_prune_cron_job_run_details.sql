-- Retenção do histórico de execução do pg_cron.
--
-- Diagnóstico (inventário do banco, 2026-11-27): `cron.job_run_details` com
-- 274.023 linhas / 53 MB desde 2026-09-16 e nenhum job de limpeza. Os quatro
-- jobs de maior volume são `sicoob-approval-outbox-worker` (94.125),
-- `process-export-queue` (93.569), `sicoob-approval-outbox-monitor` (47.062) e
-- `external-db-bridge-keepalive` (21.684) — todos com cadência de 1 minuto.
-- O growth é linear e o schema `cron` compartilha o disco do banco.
--
-- Correção: job diário às 03:17 UTC que remove execuções com mais de 7 dias.
-- A janela de 7 dias preserva a investigação de incidente da semana corrente,
-- que é o uso real do histórico hoje.
--
-- Reversão:
--   SELECT cron.unschedule('prune-cron-job-run-details');

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'prune-cron-job-run-details';
END
$block$;

SELECT cron.schedule(
  'prune-cron-job-run-details',
  '17 3 * * *',
  $cron$
    DELETE FROM cron.job_run_details
    WHERE end_time < now() - interval '7 days';
  $cron$
);

DO $assert$
DECLARE
  v_job integer;
BEGIN
  SELECT count(*) INTO v_job
  FROM cron.job
  WHERE jobname = 'prune-cron-job-run-details';

  IF v_job <> 1 THEN
    RAISE EXCEPTION 'Job prune-cron-job-run-details não foi agendado (encontrado %)', v_job;
  END IF;
END
$assert$;
