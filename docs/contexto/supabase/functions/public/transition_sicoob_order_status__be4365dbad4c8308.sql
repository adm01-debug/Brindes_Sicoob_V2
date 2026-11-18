CREATE OR REPLACE FUNCTION public.transition_sicoob_order_status(p_order_id uuid, p_expected_status text, p_new_status text, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_new_status text := trim(COALESCE(p_new_status, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;

  IF NULLIF(trim(COALESCE(p_expected_status, '')), '') IS NULL OR v_new_status = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Status atual e novo status são obrigatórios.';
  END IF;

  IF v_new_status IN ('waiting_approval', 'escalated_to_board', 'confirmed', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Use a RPC específica para preparar, solicitar, decidir ou escalar uma aprovação.';
  END IF;

  IF v_new_status = 'cancelled' THEN
    PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
    UPDATE public.sicoob_approval_requests
       SET status = 'rejected',
           approver_id = auth.uid(),
           rejection_reason = 'Pedido cancelado: ' || COALESCE(NULLIF(trim(p_comment), ''), 'sem observação adicional'),
           updated_at = now()
     WHERE order_id = p_order_id AND status = 'pending';
  END IF;

  PERFORM set_config('app.sicoob_order_status_comment', COALESCE(p_comment, ''), true);

  UPDATE public.sicoob_orders
     SET status = v_new_status,
         updated_at = now()
   WHERE id = p_order_id
     AND status = trim(p_expected_status)
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;
END;
$function$
