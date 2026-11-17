-- get_connections_hub_operational_evidence
-- A edge function `connections-hub-audit` ja consome esta RPC (index.ts:137),
-- mas nenhuma migration a criava: o painel reprovava cron jobs e triggers por
-- "evidencia operacional indisponivel", mesmo com tudo saudavel em producao.
-- Somente leitura (cron.job / cron.job_run_details / pg_trigger), SECURITY
-- DEFINER restrito a service_role.

CREATE OR REPLACE FUNCTION public.get_connections_hub_operational_evidence()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $function$
DECLARE
  v_cron jsonb := '[]'::jsonb;
  v_triggers jsonb := '[]'::jsonb;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(evidence), '[]'::jsonb) INTO v_cron
    FROM (
      SELECT jsonb_build_object(
               'name', j.jobname,
               'active', j.active,
               'last_status', r.status,
               'last_run_at', r.start_time
             ) AS evidence
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT d.status, d.start_time
        FROM cron.job_run_details d
        WHERE d.jobid = j.jobid
        ORDER BY d.start_time DESC
        LIMIT 1
      ) r ON TRUE
    ) s;
  END IF;

  SELECT COALESCE(jsonb_agg(evidence), '[]'::jsonb) INTO v_triggers
  FROM (
    SELECT jsonb_build_object(
             'table_name', c.relname,
             'trigger_name', t.tgname,
             'enabled', t.tgenabled <> 'D',
             'function_name', p.proname
           ) AS evidence
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
  ) s;

  RETURN jsonb_build_object('cron_jobs', v_cron, 'triggers', v_triggers);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_connections_hub_operational_evidence() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_connections_hub_operational_evidence() TO service_role;

COMMENT ON FUNCTION public.get_connections_hub_operational_evidence() IS
  'Evidencia operacional (cron jobs + triggers) consumida por connections-hub-audit. Somente leitura, service_role.';