CREATE OR REPLACE FUNCTION public.check_budget_availability(p_pa_id uuid, p_amount numeric)
 RETURNS TABLE(has_budget boolean, remaining numeric, limit_alcada numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        (verba_total - verba_consumida) >= p_amount as has_budget,
        (verba_total - verba_consumida) as remaining,
        limite_alcada
    FROM public.pa_budgets
    WHERE pa_id = p_pa_id 
      AND ano = EXTRACT(YEAR FROM now()) 
      AND mes = EXTRACT(MONTH FROM now());
END;
$function$
