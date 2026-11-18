CREATE OR REPLACE FUNCTION public.set_postgrest_request_timeout()
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT set_config('statement_timeout', '8s', true);
$function$
