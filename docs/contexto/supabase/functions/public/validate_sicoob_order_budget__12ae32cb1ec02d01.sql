CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget public.pa_budgets%ROWTYPE;
  v_old_consumes boolean := OLD.status IN (
    'confirmed', 'logistic', 'in_production', 'in_separation',
    'in_transit', 'delivered', 'completed'
  );
  v_new_consumes boolean := NEW.status IN (
    'confirmed', 'logistic', 'in_production', 'in_separation',
    'in_transit', 'delivered', 'completed'
  );
BEGIN
  IF v_old_consumes AND (
    NEW.pa_id IS DISTINCT FROM OLD.pa_id OR
    NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido com verba consumida não permite alterar PA, valor ou período.';
  END IF;

  IF NOT v_old_consumes AND v_new_consumes THEN
    IF NEW.pa_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Pedido confirmado exige PA e valor total positivo.';
    END IF;

    SELECT *
      INTO v_budget
      FROM public.pa_budgets
     WHERE pa_id = NEW.pa_id
       AND ano = EXTRACT(YEAR FROM NEW.created_at)::integer
       AND mes = EXTRACT(MONTH FROM NEW.created_at)::integer
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Orçamento não configurado para o PA no período do pedido.';
    END IF;

    IF v_budget.verba_consumida + NEW.total_amount > v_budget.verba_total THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Saldo de orçamento insuficiente para confirmar o pedido.';
    END IF;

    UPDATE public.pa_budgets
       SET verba_consumida = verba_consumida + NEW.total_amount,
           updated_at = now()
     WHERE id = v_budget.id;

    NEW.audit_remaining_budget :=
      v_budget.verba_total - v_budget.verba_consumida - NEW.total_amount;
  ELSIF v_old_consumes AND NOT v_new_consumes THEN
    SELECT *
      INTO v_budget
      FROM public.pa_budgets
     WHERE pa_id = OLD.pa_id
       AND ano = EXTRACT(YEAR FROM OLD.created_at)::integer
       AND mes = EXTRACT(MONTH FROM OLD.created_at)::integer
     FOR UPDATE;

    IF NOT FOUND OR v_budget.verba_consumida < OLD.total_amount THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Inconsistência de orçamento impede o estorno automático.';
    END IF;

    UPDATE public.pa_budgets
       SET verba_consumida = verba_consumida - OLD.total_amount,
           updated_at = now()
     WHERE id = v_budget.id;

    NEW.audit_remaining_budget :=
      v_budget.verba_total - v_budget.verba_consumida + OLD.total_amount;
  END IF;

  RETURN NEW;
END;
$function$
