CREATE OR REPLACE FUNCTION public.get_connections_auto_test_interval()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'cron'
AS $function$
DECLARE
  v_schedule text;
BEGIN
  SELECT schedule INTO v_schedule
    FROM cron.job
   WHERE jobname = 'connections-auto-test'
   LIMIT 1;
  RETURN public.connections_auto_test_interval_from_schedule(v_schedule);
END
$function$
