CREATE OR REPLACE FUNCTION public.tg_sicoob_order_budget_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado TEXT;
  v_budget public.pa_budgets%ROWTYPE;
BEGIN
  v_estado := public.pa_budget_estado_do_status(NEW.status);
  IF v_estado = 'liberado' THEN
    RETURN NULL;
  END IF;

  IF NEW.pa_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido confirmado exige PA e valor total positivo.';
  END IF;

  SELECT * INTO v_budget
    FROM public.pa_budgets
   WHERE pa_id = NEW.pa_id
     AND ano = EXTRACT(YEAR FROM NEW.created_at)::integer
     AND mes = EXTRACT(MONTH FROM NEW.created_at)::integer
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Orçamento não configurado para o PA no período do pedido.';
  END IF;

  PERFORM public.pa_budget_validate_allocations(
    NEW.id, NEW.total_amount, NEW.status, true);

  PERFORM public.pa_budget_apply_state(
    NEW.id, NEW.total_amount, NEW.cost_center_id, v_estado,
    'Status do pedido: ' || NEW.status,
    NEW.pa_id, NEW.created_at);

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget.id;

  UPDATE public.sicoob_orders
     SET audit_remaining_budget = COALESCE(v_budget.verba_total, 0)
       - COALESCE(v_budget.verba_reservada, 0)
       - COALESCE(v_budget.verba_comprometida, 0)
       - COALESCE(v_budget.verba_consumida, 0)
   WHERE id = NEW.id;

  RETURN NULL;
END;
$function$
