CREATE OR REPLACE FUNCTION public.sicoob_current_actor_approval_authority(p_order_id uuid, p_competence text DEFAULT 'approve_order'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_requester uuid;
  v_authority record;
  v_ends_at timestamptz;
BEGIN
  IF v_actor IS NULL OR p_competence NOT IN ('approve_order', 'reject_order') THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT requester_id INTO v_requester
  FROM public.sicoob_approval_requests
  WHERE order_id=p_order_id AND status='pending'
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;

  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor, p_order_id, v_requester,
    v_order.status='escalated_to_board', p_competence
  );
  IF v_authority.delegation_id IS NOT NULL THEN
    SELECT ends_at INTO v_ends_at FROM public.sicoob_approval_delegations
    WHERE id=v_authority.delegation_id;
  END IF;
  RETURN jsonb_build_object(
    'can_decide', true,
    'source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE
      WHEN v_authority.delegation_id IS NULL THEN NULL
      ELSE v_authority.authority_delegator_id
    END,
    'ends_at', v_ends_at
  );
EXCEPTION WHEN insufficient_privilege OR no_data_found THEN
  RETURN jsonb_build_object('can_decide', false, 'source', 'none');
END;
$function$
