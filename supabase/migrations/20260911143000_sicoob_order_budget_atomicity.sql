-- Consolida o ciclo financeiro dos pedidos Sicoob.
-- O histórico possuía dois gatilhos de verba ativos sobre a mesma transição.

DROP TRIGGER IF EXISTS trg_validate_sicoob_order ON public.sicoob_orders;
DROP TRIGGER IF EXISTS trg_validate_sicoob_order_budget ON public.sicoob_orders;

CREATE OR REPLACE FUNCTION public.validate_sicoob_order_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trg_validate_sicoob_order_budget
BEFORE UPDATE OF status, pa_id, total_amount, created_at
ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_sicoob_order_budget();

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_transitions jsonb := '{
    "draft": ["pending", "cancelled"],
    "pending": ["waiting_approval", "cancelled"],
    "waiting_approval": ["confirmed", "rejected", "escalated_to_board", "cancelled"],
    "escalated_to_board": ["confirmed", "rejected", "cancelled"],
    "confirmed": ["logistic", "in_production", "cancelled"],
    "logistic": ["completed", "cancelled"],
    "in_production": ["in_separation", "cancelled"],
    "in_separation": ["in_transit", "cancelled"],
    "in_transit": ["delivered", "cancelled"],
    "delivered": ["completed", "cancelled"],
    "completed": [],
    "rejected": ["draft", "pending"],
    "cancelled": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_transitions ? OLD.status AND
    NEW.status = ANY (ARRAY(
      SELECT jsonb_array_elements_text(v_transitions -> OLD.status)
    ))
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format('Transição de status inválida: de %s para %s', OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_sicoob_order_status ON public.sicoob_orders;
CREATE TRIGGER tr_validate_sicoob_order_status
BEFORE UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_status_transition();

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_approve(
  p_actor_id uuid,
  p_order_id uuid,
  p_board_only boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
      LEFT JOIN public.profiles p
        ON p.user_id = p_actor_id OR p.id = p_actor_id
     WHERE o.id = p_order_id
       AND (
         EXISTS (
           SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role::text IN ('dev', 'supervisor')
         )
         OR (
           EXISTS (
             SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = p_actor_id
                AND ur.role::text IN ('gestor_compras', 'comprador_singular')
           )
           AND p.cooperativa_id = o.cooperative_id
         )
         OR (
           NOT p_board_only
           AND EXISTS (
             SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = p_actor_id
                AND ur.role::text = 'gerente_pa'
           )
           AND p.pa_id = o.pa_id
         )
       )
  );
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_approve(uuid, uuid, boolean) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.confirm_sicoob_order(
  p_order_id uuid,
  p_expected_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_limit numeric;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM p_expected_status OR v_order.status <> 'waiting_approval' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O pedido mudou; atualize a página antes de confirmar.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido possui solicitação de aprovação pendente.';
  END IF;
  IF NOT public.sicoob_actor_can_approve(v_actor_id, v_order.id, false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Aprovador fora da alçada ou do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_limit
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_limit IS NULL OR v_order.total_amount > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido requer solicitação formal de aprovação.';
  END IF;

  UPDATE public.sicoob_orders
     SET status = 'confirmed', approved_by = v_actor_id,
         approved_at = now(), updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'confirm_within_limit', jsonb_build_object('previous_status', v_order.status));
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_sicoob_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_sicoob_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Identidade do aprovador inválida.';
  END IF;

  SELECT * INTO v_request
    FROM public.sicoob_approval_requests
   WHERE id = p_request_id
   FOR UPDATE;
  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_request.id IS NULL OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Solicitação já decidida.';
  END IF;
  IF v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedido não está aguardando aprovação.';
  END IF;
  IF NOT public.sicoob_actor_can_approve(
    v_actor_id,
    v_order.id,
    v_order.status = 'escalated_to_board'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Aprovador fora da alçada ou do escopo do pedido.';
  END IF;

  UPDATE public.sicoob_approval_requests
     SET status = 'approved', approver_id = v_actor_id, updated_at = now()
   WHERE id = v_request.id;
  UPDATE public.sicoob_orders
     SET status = 'confirmed', approved_by = v_actor_id,
         approved_at = now(), updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'approve', jsonb_build_object('request_id', v_request.id));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Identidade do aprovador inválida.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_request
    FROM public.sicoob_approval_requests
   WHERE id = p_request_id
   FOR UPDATE;
  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_request.id IS NULL OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Solicitação já decidida.';
  END IF;
  IF v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedido não está aguardando aprovação.';
  END IF;
  IF NOT public.sicoob_actor_can_approve(
    v_actor_id,
    v_order.id,
    v_order.status = 'escalated_to_board'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Aprovador fora da alçada ou do escopo do pedido.';
  END IF;

  UPDATE public.sicoob_approval_requests
     SET status = 'rejected', approver_id = v_actor_id,
         rejection_reason = trim(p_reason), updated_at = now()
   WHERE id = v_request.id;
  UPDATE public.sicoob_orders
     SET status = 'rejected', updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (
    v_actor_id, v_order.id, 'reject',
    jsonb_build_object('request_id', v_request.id, 'reason', trim(p_reason))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_sicoob_order(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_sicoob_order(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_sicoob_order(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sicoob_order(uuid, uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.validate_sicoob_order_budget() IS
  'Único gatilho financeiro de pedidos Sicoob; serializa por verba e debita/estorna uma vez por transição.';
