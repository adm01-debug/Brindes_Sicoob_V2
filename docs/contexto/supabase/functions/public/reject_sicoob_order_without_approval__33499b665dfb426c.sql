CREATE OR REPLACE FUNCTION public.reject_sicoob_order_without_approval(p_order_id uuid, p_expected_status text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IS DISTINCT FROM p_expected_status OR v_order.status <> 'waiting_approval' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível para rejeição.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sicoob_approval_requests WHERE order_id = v_order.id AND status = 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Use a rejeição vinculada à solicitação de aprovação pendente.';
  END IF;

  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_order.id, NULL, false);
  PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
  PERFORM set_config('app.sicoob_order_status_comment', trim(p_reason), true);

  UPDATE public.sicoob_orders
     SET status = 'rejected', updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.sicoob_manager_audit (manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'reject_without_formal_request', jsonb_build_object('reason', trim(p_reason), 'policy_version', v_order.approval_policy_version));
END;
$function$
