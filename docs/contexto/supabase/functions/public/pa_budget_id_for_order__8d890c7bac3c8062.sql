CREATE OR REPLACE FUNCTION public.pa_budget_id_for_order(p_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pa_id UUID;
  v_created TIMESTAMPTZ;
  v_budget UUID;
BEGIN
  SELECT pa_id, created_at INTO v_pa_id, v_created
    FROM public.sicoob_orders WHERE id = p_order_id;

  IF v_pa_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Chamadas de usuário só resolvem a verba de pedido que ele pode ler.
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT public.sicoob_current_actor_can_read_order(p_order_id) THEN
    RAISE EXCEPTION 'Sem permissao para consultar a verba do pedido %.', p_order_id;
  END IF;

  SELECT id INTO v_budget
    FROM public.pa_budgets
   WHERE pa_id = v_pa_id
     AND ano = EXTRACT(YEAR FROM v_created)::INT
     AND mes = EXTRACT(MONTH FROM v_created)::INT
   LIMIT 1;

  RETURN v_budget;
END;
$function$
