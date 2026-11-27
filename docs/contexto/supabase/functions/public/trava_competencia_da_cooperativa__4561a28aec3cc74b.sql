CREATE OR REPLACE FUNCTION public._trava_competencia_da_cooperativa(p_cooperativa_id uuid, p_ano integer, p_mes integer)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT pg_advisory_xact_lock(
    hashtextextended(p_cooperativa_id::text || ':' || p_ano::text || ':' || p_mes::text, 0)
  );
$function$
