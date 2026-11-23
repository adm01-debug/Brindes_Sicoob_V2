CREATE OR REPLACE FUNCTION public.pa_budget_estado_do_status(p_status text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN p_status IN ('waiting_approval', 'escalated_to_board') THEN 'reservado'
    WHEN p_status IN ('confirmed', 'logistic', 'in_production',
                      'in_separation', 'in_transit') THEN 'comprometido'
    WHEN p_status IN ('delivered', 'completed') THEN 'consumido'
    ELSE 'liberado'
  END;
$function$
