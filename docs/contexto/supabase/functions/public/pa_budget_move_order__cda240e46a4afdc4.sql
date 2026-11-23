CREATE OR REPLACE FUNCTION public.pa_budget_move_order(p_order_id uuid, p_para_estado text, p_motivo text DEFAULT NULL::text)
 RETURNS pa_budgets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total NUMERIC(14,2);
  v_cc UUID;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT public.sicoob_current_actor_can_read_order(p_order_id) THEN
    RAISE EXCEPTION 'Sem permissao para movimentar a verba do pedido %.', p_order_id;
  END IF;

  SELECT COALESCE(total_amount, 0), cost_center_id
    INTO v_total, v_cc
    FROM public.sicoob_orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % inexistente.', p_order_id;
  END IF;

  RETURN public.pa_budget_apply_state(p_order_id, v_total, v_cc, p_para_estado, p_motivo);
END;
$function$
