CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_estado TEXT;
  v_new_estado TEXT;
  v_budget public.pa_budgets%ROWTYPE;
  v_period_changed BOOLEAN;
  v_total_changed BOOLEAN;
BEGIN
  v_old_estado := public.pa_budget_estado_do_status(OLD.status);
  v_new_estado := public.pa_budget_estado_do_status(NEW.status);
  v_period_changed := NEW.pa_id IS DISTINCT FROM OLD.pa_id
                      OR NEW.created_at IS DISTINCT FROM OLD.created_at;
  v_total_changed  := NEW.total_amount IS DISTINCT FROM OLD.total_amount;

  -- Pedido já entregue/consumido não pode ter escopo financeiro reescrito.
  IF v_old_estado = 'consumido' AND (v_period_changed OR v_total_changed) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido com verba consumida não permite alterar PA, valor ou período.';
  END IF;

  -- Entrar no ciclo exige PA e valor.
  IF v_new_estado <> 'liberado'
     AND (NEW.pa_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido confirmado exige PA e valor total positivo.';
  END IF;

  -- Mudou o PA/período estando no ciclo: libera a competência antiga antes.
  IF v_period_changed AND v_old_estado <> 'liberado' THEN
    PERFORM public.pa_budget_apply_state(
      NEW.id, OLD.total_amount, OLD.cost_center_id, 'liberado',
      'Pedido trocou de PA ou competência', OLD.pa_id, OLD.created_at);
  END IF;

  IF v_new_estado <> 'liberado' THEN
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

    -- Mudar o total com rateio já fechado exigiria reescrever o rateio na
    -- mesma instrução; por isso a revalidação vem ANTES de mover a posição.
    PERFORM public.pa_budget_validate_allocations(
      NEW.id, NEW.total_amount, NEW.status, true);

    PERFORM public.pa_budget_apply_state(
      NEW.id, NEW.total_amount, NEW.cost_center_id, v_new_estado,
      'Status do pedido: ' || NEW.status,
      NEW.pa_id, NEW.created_at);

    SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget.id;

    NEW.audit_remaining_budget := COALESCE(v_budget.verba_total, 0)
      - COALESCE(v_budget.verba_reservada, 0)
      - COALESCE(v_budget.verba_comprometida, 0)
      - COALESCE(v_budget.verba_consumida, 0);
  ELSIF v_old_estado <> 'liberado' THEN
    PERFORM public.pa_budget_apply_state(
      NEW.id, OLD.total_amount, OLD.cost_center_id, 'liberado',
      'Status do pedido: ' || NEW.status, OLD.pa_id, OLD.created_at);
  ELSIF v_period_changed OR v_total_changed THEN
    -- Pedido ainda fora do ciclo (rascunho): o rateio pode ficar defasado
    -- enquanto o pedido e montado, senao alterar item viraria impasse. A soma
    -- de 100% e cobrada quando o pedido entra na verba (ramo acima).
    PERFORM public.pa_budget_validate_allocations(
      NEW.id, NEW.total_amount, NEW.status, false);
  END IF;

  RETURN NEW;
END;
$function$
