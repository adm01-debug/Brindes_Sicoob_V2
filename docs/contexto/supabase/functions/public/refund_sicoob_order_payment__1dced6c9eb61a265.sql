CREATE OR REPLACE FUNCTION public.refund_sicoob_order_payment(p_payment_id uuid, p_reason text, p_expected_updated_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order_id uuid;
  v_payment public.sicoob_order_payments%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR length(trim(COALESCE(p_reason, ''))) < 10 OR p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Motivo e versão atual da parcela são obrigatórios para o estorno.';
  END IF;
  SELECT order_id INTO v_order_id FROM public.sicoob_order_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Parcela não encontrada.'; END IF;
  IF NOT public.sicoob_actor_can_manage_finance(v_actor_id, v_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode estornar pagamentos deste pedido.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_order_id::text || ':finance', 0));
  SELECT * INTO v_payment FROM public.sicoob_order_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela mudou; atualize a página antes de estornar.';
  END IF;
  IF v_payment.status <> 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente uma parcela paga pode ser estornada.';
  END IF;

  PERFORM set_config('app.sicoob_payment_operation', 'refund', true);
  UPDATE public.sicoob_order_payments
     SET status = 'refunded',
         refunded_at = now(),
         refunded_by = v_actor_id,
         refund_reason = trim(p_reason),
         updated_by = v_actor_id,
         updated_at = now()
   WHERE id = p_payment_id;
END;
$function$
