CREATE OR REPLACE FUNCTION public.get_connections_hub_operational_evidence()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'cron'
AS $function$
DECLARE
  v_cron jsonb := '[]'::jsonb;
  v_triggers jsonb := '[]'::jsonb;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL
     AND to_regclass('cron.job_run_details') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(jobs)), '[]'::jsonb)
      INTO v_cron
      FROM (
        SELECT
          j.jobname AS name,
          j.active,
          j.schedule,
          r.status AS last_status,
          r.start_time AS last_run_at
        FROM cron.job j
        LEFT JOIN LATERAL (
          SELECT d.status, d.start_time
          FROM cron.job_run_details d
          WHERE d.jobid = j.jobid
          ORDER BY d.start_time DESC NULLS LAST
          LIMIT 1
        ) r ON true
        WHERE j.jobname IN ('webhook-retry-failed', 'webhook-logs-cleanup-daily')
      ) jobs;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(triggers)), '[]'::jsonb)
    INTO v_triggers
    FROM (
      SELECT
        c.relname AS table_name,
        t.tgname AS trigger_name,
        t.tgenabled <> 'D' AS enabled,
        p.proname AS function_name
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal
        AND n.nspname = 'public'
        AND c.relname IN (
          'quotes', 'orders', 'discount_approval_requests', 'kit_share_tokens'
        )
        AND t.tgname IN (
          'trg_dispatch_webhook_quotes',
          'trg_dispatch_webhook_orders',
          'trg_dispatch_webhook_discount',
          'trg_dispatch_webhook_kit_share'
        )
    ) triggers;

  RETURN jsonb_build_object('cron_jobs', v_cron, 'triggers', v_triggers);
END
$function$
