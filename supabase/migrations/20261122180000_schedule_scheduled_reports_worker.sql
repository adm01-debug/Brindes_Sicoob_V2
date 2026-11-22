-- EDG-24: o gestor agenda o relatório na UI e nada era enviado porque nenhuma
-- migration criava o job de cron para `send-scheduled-reports`. O agendamento
-- ficava com `next_run_at` no passado para sempre.
--
-- A função é despachada por uma RPC SECURITY DEFINER que lê URL e segredo do
-- Vault, seguindo o padrão de `dispatch_sicoob_approval_worker`: URL e
-- credencial nunca ficam no texto do job. Sem os dois segredos a função só
-- emite WARNING — não há requisição externa nem quebra do cron.

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_reports()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, net
AS $function$
DECLARE
  v_project_url text;
  v_internal_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_internal_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_internal_function_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_internal_secret, '')) NOT BETWEEN 32 AND 512 THEN
    RAISE WARNING 'Relatórios agendados não configurados no Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/send-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sicoob-internal-secret', v_internal_secret
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 40000
  ) INTO v_request_id;

  RETURN v_request_id;
END
$function$;

REVOKE ALL ON FUNCTION public.dispatch_scheduled_reports() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_scheduled_reports() TO service_role;

COMMENT ON FUNCTION public.dispatch_scheduled_reports() IS
'Despacha os relatórios agendados vencidos para a Edge Function send-scheduled-reports; lê URL e segredo do Vault a cada execução.';

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'scheduled-reports-worker';
END
$block$;

-- A cada 10 minutos: a janela cobre a virada do horário de 8h definido no
-- próximo `next_run_at` e mantém o custo de invocação baixo.
SELECT cron.schedule(
  'scheduled-reports-worker',
  '*/10 * * * *',
  $cron$SELECT public.dispatch_scheduled_reports();$cron$
);

DO $assert$
DECLARE
  v_job integer;
BEGIN
  SELECT count(*) INTO v_job
  FROM cron.job
  WHERE jobname = 'scheduled-reports-worker';

  IF v_job <> 1 THEN
    RAISE EXCEPTION 'Job scheduled-reports-worker não foi agendado (encontrado %)', v_job;
  END IF;
END
$assert$;

-- Rollback (documentado por exigência de CONTRIBUTING.md)
--
-- SELECT cron.unschedule('scheduled-reports-worker');
-- DROP FUNCTION IF EXISTS public.dispatch_scheduled_reports();
--
-- Reverter é seguro e não destrutivo: a função só enfileira chamadas HTTP para
-- a edge function; nenhuma tabela ou dado é criado por ela. Os agendamentos em
-- `scheduled_reports` permanecem intactos e voltam a ser processados quando o
-- job for reagendado. O harness `scripts/qa/simular-relatorios-agendados-cron.py`
-- cobre o caminho de reversão (bloco `REVERSAO`).
