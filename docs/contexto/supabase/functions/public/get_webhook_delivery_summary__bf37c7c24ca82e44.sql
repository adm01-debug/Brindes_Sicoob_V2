CREATE OR REPLACE FUNCTION public.get_webhook_delivery_summary(_minutes integer DEFAULT 60)
 RETURNS TABLE(source text, direction text, status_class text, total bigint, failures bigint, p95_ms integer, last_failure_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    source,
    direction,
    CASE
      WHEN http_status BETWEEN 200 AND 299 THEN '2xx'
      WHEN http_status BETWEEN 300 AND 399 THEN '3xx'
      WHEN http_status BETWEEN 400 AND 499 THEN '4xx'
      WHEN http_status BETWEEN 500 AND 599 THEN '5xx'
      ELSE 'unknown'
    END AS status_class,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE success = false)::BIGINT AS failures,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INT AS p95_ms,
    MAX(occurred_at) FILTER (WHERE success = false) AS last_failure_at
  FROM public.webhook_delivery_metrics
  WHERE occurred_at >= now() - make_interval(mins => _minutes)
  GROUP BY source, direction, status_class
  ORDER BY source, direction, status_class;
$function$
