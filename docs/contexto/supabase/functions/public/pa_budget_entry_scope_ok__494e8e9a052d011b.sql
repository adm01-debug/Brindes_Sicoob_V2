CREATE OR REPLACE FUNCTION public.pa_budget_entry_scope_ok(p_budget_id uuid, p_pa_id uuid, p_ano integer, p_mes integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.pa_budgets AS budget
     WHERE budget.id = p_budget_id
       AND budget.pa_id = p_pa_id
       AND budget.ano = p_ano
       AND budget.mes = p_mes
  );
$function$
