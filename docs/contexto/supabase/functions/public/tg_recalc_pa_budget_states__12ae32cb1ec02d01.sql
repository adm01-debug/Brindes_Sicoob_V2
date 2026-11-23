CREATE OR REPLACE FUNCTION public.tg_recalc_pa_budget_states()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget_id UUID;
BEGIN
  v_budget_id := COALESCE(NEW.pa_budget_id, OLD.pa_budget_id);

  UPDATE public.pa_budgets b
     SET verba_reservada = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'reservado'
         ), 0),
         verba_comprometida = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'comprometido'
         ), 0),
         verba_consumida = COALESCE((
           SELECT sum(e.valor) FROM public.pa_budget_entries e
            WHERE e.pa_budget_id = v_budget_id AND e.estado = 'consumido'
         ), 0),
         updated_at = now()
   WHERE b.id = v_budget_id;

  RETURN NULL;
END;
$function$
