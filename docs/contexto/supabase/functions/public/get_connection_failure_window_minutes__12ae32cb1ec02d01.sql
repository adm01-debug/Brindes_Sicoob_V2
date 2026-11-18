CREATE OR REPLACE FUNCTION public.get_connection_failure_window_minutes()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT (value)::text::int FROM public.system_settings
     WHERE key = 'connection_failure_window_minutes'),
    30
  );
$function$
