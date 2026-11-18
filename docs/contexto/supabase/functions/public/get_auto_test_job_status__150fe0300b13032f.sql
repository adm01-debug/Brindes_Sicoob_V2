CREATE OR REPLACE FUNCTION public.get_auto_test_job_status(_limit integer DEFAULT 20)
 RETURNS TABLE(run_started_at timestamp with time zone, run_ended_at timestamp with time zone, duration_ms integer, total_tested integer, ok_count integer, fail_count integer, retried_count integer, avg_latency_ms integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  RETURN QUERY
  WITH ordered AS (
    SELECT
      cth.tested_at,
      cth.success,
      cth.latency_ms,
      cth.attempts,
      date_trunc('minute', cth.tested_at) AS bucket
    FROM public.connection_test_history cth
    WHERE cth.triggered_by = 'cron'
      AND cth.tested_at > now() - interval '7 days'
  ),
  runs AS (
    SELECT
      o.bucket,
      MIN(o.tested_at) AS run_started_at,
      MAX(o.tested_at) AS run_ended_at,
      GREATEST(EXTRACT(EPOCH FROM (MAX(o.tested_at) - MIN(o.tested_at))) * 1000, 0)::int AS duration_ms,
      COUNT(*)::int AS total_tested,
      COUNT(*) FILTER (WHERE o.success)::int AS ok_count,
      COUNT(*) FILTER (WHERE NOT o.success)::int AS fail_count,
      COUNT(*) FILTER (WHERE o.attempts > 1)::int AS retried_count,
      COALESCE(AVG(o.latency_ms) FILTER (WHERE o.latency_ms IS NOT NULL), 0)::int AS avg_latency_ms
    FROM ordered o
    GROUP BY o.bucket
  )
  SELECT
    r.run_started_at,
    r.run_ended_at,
    r.duration_ms,
    r.total_tested,
    r.ok_count,
    r.fail_count,
    r.retried_count,
    r.avg_latency_ms
  FROM runs r
  ORDER BY r.run_started_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END;
$function$
