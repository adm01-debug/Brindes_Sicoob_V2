CREATE OR REPLACE FUNCTION public.reject_sicoob_order(p_request_id uuid, p_order_id uuid, p_manager_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
  v_authority record;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Identidade do aprovador inválida.';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id FOR UPDATE;
  SELECT * INTO v_request FROM public.sicoob_approval_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' OR v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Solicitação ou pedido não está disponível para rejeição.';
  END IF;
  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor_id, v_order.id, v_request.requester_id,
    v_order.status='escalated_to_board', 'reject_order'
  );
  PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
  PERFORM set_config('app.sicoob_order_status_comment', btrim(p_reason), true);
  UPDATE public.sicoob_approval_requests SET
    status='rejected', approver_id=v_actor_id, rejection_reason=btrim(p_reason),
    approval_delegation_id=v_authority.delegation_id,
    authority_delegator_id=CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END,
    updated_at=clock_timestamp()
  WHERE id=v_request.id;
  UPDATE public.sicoob_orders SET status='rejected', updated_at=clock_timestamp()
  WHERE id=v_order.id;
  INSERT INTO public.sicoob_manager_audit(manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'reject', jsonb_build_object(
    'request_id', v_request.id,
    'reason', btrim(p_reason),
    'policy_version', v_order.approval_policy_version,
    'authority_source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END
  ));
END;
$function$
