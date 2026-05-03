CREATE OR REPLACE FUNCTION public.get_query_telemetry_p95(window_minutes integer DEFAULT 60)
RETURNS TABLE(operation TEXT, p95_ms NUMERIC, avg_ms NUMERIC, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(rpc_name, table_name, operation) as op,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric as p95,
        AVG(duration_ms)::numeric as avg,
        COUNT(*) as cnt
    FROM public.query_telemetry
    WHERE created_at >= now() - (window_minutes || ' minutes')::interval
    GROUP BY 1
    ORDER BY p95 DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
