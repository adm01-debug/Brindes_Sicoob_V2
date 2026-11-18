CREATE OR REPLACE FUNCTION public.e2e_cleanup_check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
 RETURNS TABLE(allowed boolean, current_count integer, reset_in_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO public.e2e_cleanup_rate_limit AS r (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN 1
          ELSE r.count + 1
        END,
        window_start = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN v_now
          ELSE r.window_start
        END,
        updated_at = v_now
  RETURNING r.count, r.window_start INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_max) AS allowed,
    v_count AS current_count,
    GREATEST(0, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_window_start))::INT) AS reset_in_seconds;
END;
$function$
