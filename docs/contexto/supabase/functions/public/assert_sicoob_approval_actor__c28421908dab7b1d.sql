CREATE OR REPLACE FUNCTION public.assert_sicoob_approval_actor(p_actor_id uuid, p_order_id uuid, p_requester_id uuid DEFAULT NULL::uuid, p_board_only boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.sicoob_orders%ROWTYPE;
  v_policy record;
BEGIN
  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;

  SELECT * INTO v_policy
    FROM public.get_sicoob_order_approval_policy(p_order_id);

  IF v_policy.require_active_membership
     AND NOT EXISTS (
       SELECT 1
         FROM public.profiles p
        WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
          AND p.is_active IS TRUE
          AND p.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A decisão exige vínculo ativo com a cooperativa.';
  END IF;

  IF v_policy.forbid_self_approval
     AND (v_order.created_by = p_actor_id OR p_requester_id = p_actor_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A política vigente não permite decidir o próprio pedido.';
  END IF;

  IF NOT public.sicoob_actor_can_approve(p_actor_id, p_order_id, p_board_only) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Aprovador fora da alçada ou do escopo do pedido.';
  END IF;
END;
$function$
