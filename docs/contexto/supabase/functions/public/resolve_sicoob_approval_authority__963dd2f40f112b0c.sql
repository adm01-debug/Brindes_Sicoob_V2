CREATE OR REPLACE FUNCTION public.resolve_sicoob_approval_authority(p_actor_id uuid, p_order_id uuid, p_requester_id uuid, p_board_only boolean, p_competence text)
 RETURNS TABLE(delegation_id uuid, authority_delegator_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.sicoob_orders%ROWTYPE;
  v_policy record;
BEGIN
  IF p_competence NOT IN ('approve_order', 'reject_order') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Competência de aprovação inválida.';
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Pedido não encontrado.';
  END IF;
  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(p_order_id);

  IF public.sicoob_actor_can_approve(p_actor_id, p_order_id, p_board_only) THEN
    PERFORM public.assert_sicoob_approval_actor(
      p_actor_id, p_order_id, p_requester_id, p_board_only
    );
    RETURN QUERY SELECT NULL::uuid, p_actor_id;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT delegation.id, delegation.delegator_id
  FROM public.sicoob_approval_delegations delegation
  JOIN public.profiles delegate_profile
    ON delegate_profile.user_id=p_actor_id OR delegate_profile.id=p_actor_id
  WHERE delegation.delegate_id=p_actor_id
    AND delegation.revoked_at IS NULL
    AND delegation.starts_at <= statement_timestamp()
    AND delegation.ends_at > statement_timestamp()
    AND p_competence=ANY(delegation.competencies)
    AND delegation.cooperative_id=v_order.cooperative_id
    AND (delegation.pa_id IS NULL OR delegation.pa_id=v_order.pa_id)
    AND delegate_profile.is_active IS TRUE
    AND delegate_profile.deleted_at IS NULL
    AND delegate_profile.cooperativa_id=delegation.cooperative_id
    AND (delegation.pa_id IS NULL OR delegate_profile.pa_id=delegation.pa_id)
    AND public.sicoob_actor_can_approve(
      delegation.delegator_id, p_order_id, p_board_only
    )
    AND (
      NOT v_policy.forbid_self_approval
      OR (
        v_order.created_by NOT IN (p_actor_id, delegation.delegator_id)
        AND p_requester_id NOT IN (p_actor_id, delegation.delegator_id)
      )
    )
  ORDER BY delegation.ends_at, delegation.id
  LIMIT 1
  FOR SHARE OF delegation;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Ator sem autoridade própria ou delegação vigente para esta decisão.';
  END IF;
END;
$function$
