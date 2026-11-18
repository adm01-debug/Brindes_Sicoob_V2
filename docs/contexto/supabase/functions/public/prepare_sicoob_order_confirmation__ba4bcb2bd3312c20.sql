CREATE OR REPLACE FUNCTION public.prepare_sicoob_order_confirmation(p_order_id uuid, p_expected_status text, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_limit numeric;
  v_policy record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.status IS DISTINCT FROM p_expected_status OR v_order.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível para preparação.';
  END IF;
  IF NOT public.sicoob_actor_can_request_approval(v_actor_id, v_order.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_limit
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_limit IS NULL OR COALESCE(v_order.total_amount, 0) > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido requer solicitação formal de aprovação.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  PERFORM set_config('app.sicoob_approval_operation', 'prepare', true);
  PERFORM set_config('app.sicoob_order_status_comment', COALESCE(p_comment, 'Preparado para confirmação dentro da alçada.'), true);

  UPDATE public.sicoob_orders
     SET status = 'waiting_approval',
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;
END;
$function$
