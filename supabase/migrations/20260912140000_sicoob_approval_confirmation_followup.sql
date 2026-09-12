-- Corrige instalações que já receberam a primeira versão das guardas de
-- aprovação. Mantém a confirmação dentro da alçada atômica quando o pedido
-- ainda está pendente e torna a proteção do aprovador nula-segura.

CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := current_setting('app.sicoob_approval_operation', true);
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.request_reason IS DISTINCT FROM OLD.request_reason
     OR NEW.amount_at_request IS DISTINCT FROM OLD.amount_at_request
     OR NEW.threshold_at_request IS DISTINCT FROM OLD.threshold_at_request THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os dados submetidos para aprovação são imutáveis.';
  END IF;

  IF NEW.metadata IS DISTINCT FROM OLD.metadata AND v_operation IS DISTINCT FROM 'escalate' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os metadados da solicitação não podem ser alterados fora da escalação formal.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending'
       OR (NEW.status = 'approved' AND v_operation IS DISTINCT FROM 'approve')
       OR (NEW.status = 'rejected' AND v_operation IS DISTINCT FROM 'reject') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O resultado da aprovação exige RPC de decisão formal.';
    END IF;
  END IF;

  IF NEW.approver_id IS DISTINCT FROM OLD.approver_id
     AND v_operation IS DISTINCT FROM 'approve'
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O aprovador só pode ser definido na decisão formal.';
  END IF;

  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O motivo de rejeição só pode ser definido na decisão formal.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_sicoob_approval_request() FROM PUBLIC;

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
  v_policy record;
  v_initial_status text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM p_expected_status
     OR v_order.status NOT IN ('pending', 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O pedido mudou; atualize a página antes de confirmar.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sicoob_approval_requests WHERE order_id = v_order.id AND status = 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido possui solicitação de aprovação pendente.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, NULL, false);

  SELECT limite_alcada INTO v_limit
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;
  IF v_limit IS NULL OR v_order.total_amount > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido requer solicitação formal de aprovação.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  v_initial_status := v_order.status;

  IF v_order.status = 'pending' THEN
    PERFORM set_config('app.sicoob_approval_operation', 'prepare', true);
    PERFORM set_config('app.sicoob_order_status_comment', 'Preparado para confirmação dentro da alçada.', true);
    UPDATE public.sicoob_orders
       SET status = 'waiting_approval',
           approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
           approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
           updated_at = now()
     WHERE id = v_order.id;
  END IF;

  PERFORM set_config('app.sicoob_approval_operation', 'confirm', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Confirmado dentro da alçada.', true);
  UPDATE public.sicoob_orders
     SET status = 'confirmed',
         approved_by = v_actor_id,
         approved_at = now(),
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'confirm_within_limit', jsonb_build_object('previous_status', v_initial_status, 'policy_version', v_policy.policy_version));
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_sicoob_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_sicoob_order(uuid, text) TO authenticated;
