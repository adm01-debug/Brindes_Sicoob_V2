CREATE OR REPLACE FUNCTION public.get_query_telemetry_p95(window_minutes integer DEFAULT 60)
 RETURNS TABLE(operation text, p95_ms numeric, avg_ms numeric, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(qt.rpc_name, qt.table_name, qt.operation) as op,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY qt.duration_ms)::numeric as p95,
        AVG(qt.duration_ms)::numeric as avg,
        COUNT(*) as cnt
    FROM public.query_telemetry AS qt
    WHERE qt.created_at >= now() - (window_minutes || ' minutes')::interval
    GROUP BY 1
    ORDER BY p95 DESC;
END;
$function$
