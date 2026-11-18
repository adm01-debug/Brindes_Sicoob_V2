CREATE OR REPLACE FUNCTION public.get_platform_failure_metrics(window_minutes integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  window_start timestamptz := now() - make_interval(mins => COALESCE(window_minutes, 60));
  total_calls bigint;
  total_503 bigint;
  total_cold bigint;
  recent_cold_at timestamptz;
  prev_window_start timestamptz := now() - make_interval(mins => COALESCE(window_minutes, 60) * 2);
  prev_503 bigint;
BEGIN
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE is_503 = true),
         COUNT(*) FILTER (WHERE is_cold_start = true),
         MAX(created_at) FILTER (WHERE is_cold_start = true)
    INTO total_calls, total_503, total_cold, recent_cold_at
  FROM public.query_telemetry
  WHERE created_at >= window_start;

  SELECT COUNT(*) FILTER (WHERE is_503 = true)
    INTO prev_503
  FROM public.query_telemetry
  WHERE created_at >= prev_window_start AND created_at < window_start;

  RETURN jsonb_build_object(
    'window_minutes', window_minutes,
    'total_calls', COALESCE(total_calls, 0),
    'total_503', COALESCE(total_503, 0),
    'total_cold_starts', COALESCE(total_cold, 0),
    'rate_503_pct', CASE WHEN COALESCE(total_calls, 0) = 0 THEN 0
                         ELSE ROUND(total_503::numeric / total_calls::numeric * 100, 2) END,
    'rate_cold_start_pct', CASE WHEN COALESCE(total_calls, 0) = 0 THEN 0
                                ELSE ROUND(total_cold::numeric / total_calls::numeric * 100, 2) END,
    'last_cold_start_at', recent_cold_at,
    'prev_window_503', COALESCE(prev_503, 0),
    'delta_503', COALESCE(total_503, 0) - COALESCE(prev_503, 0)
  );
END;
$function$
