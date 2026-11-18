CREATE OR REPLACE FUNCTION public.request_sicoob_order_approval(p_order_id uuid, p_expected_status text, p_reason text, p_threshold numeric, p_is_escalated boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_target_status text := CASE WHEN p_is_escalated THEN 'escalated_to_board' ELSE 'waiting_approval' END;
  v_threshold numeric;
  v_request_id uuid;
  v_comment text;
  v_policy record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com ao menos 10 caracteres.';
  END IF;
  IF (NOT p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'pending')
    OR (p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O status atual não permite esta solicitação de aprovação.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.status IS DISTINCT FROM trim(p_expected_status) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;
  IF NOT public.sicoob_actor_can_request_approval(v_actor_id, v_order.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_threshold
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_threshold IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A alçada do PA não está configurada para o período do pedido.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  v_comment := format(
    'Solicitação de aprovação%s: %s',
    CASE WHEN p_is_escalated THEN ' para a Diretoria' ELSE '' END,
    trim(p_reason)
  );
  PERFORM set_config('app.sicoob_approval_operation', CASE WHEN p_is_escalated THEN 'escalate' ELSE 'request' END, true);
  PERFORM set_config('app.sicoob_order_status_comment', v_comment, true);

  IF p_is_escalated THEN
    SELECT id INTO v_request_id
      FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
     FOR UPDATE;

    IF v_request_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A escalação exige uma solicitação de aprovação pendente.';
    END IF;

    UPDATE public.sicoob_approval_requests
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'escalated', true,
             'level', 'board',
             'escalation_reason', trim(p_reason),
             'approval_policy_version', v_policy.policy_version,
             'client_threshold', p_threshold,
             'resolved_threshold', v_threshold
           ),
           updated_at = now()
     WHERE id = v_request_id;
  ELSIF EXISTS (
    SELECT 1 FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido já possui uma solicitação de aprovação pendente.';
  ELSE
    INSERT INTO public.sicoob_approval_requests (
      order_id,
      requester_id,
      request_reason,
      amount_at_request,
      threshold_at_request,
      status,
      metadata
    ) VALUES (
      v_order.id,
      v_actor_id,
      trim(p_reason),
      COALESCE(v_order.total_amount, 0),
      v_threshold,
      'pending',
      jsonb_build_object(
        'escalated', false,
        'level', 'manager',
        'approval_policy_version', v_policy.policy_version,
        'client_threshold', p_threshold,
        'resolved_threshold', v_threshold
      )
    )
    RETURNING id INTO v_request_id;
  END IF;

  UPDATE public.sicoob_orders
     SET status = v_target_status,
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;

  RETURN v_request_id;
END;
$function$
