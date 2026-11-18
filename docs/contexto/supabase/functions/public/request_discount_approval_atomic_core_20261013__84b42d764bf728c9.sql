CREATE OR REPLACE FUNCTION public.request_discount_approval_atomic_core_20261013(p_quote_id uuid, p_expected_quote_row_version integer, p_requested_discount_percent numeric, p_seller_notes text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid, quote_id uuid, seller_id uuid, quote_row_version integer, requested_discount_percent numeric, max_allowed_percent numeric, negotiation_markup_percent numeric, real_discount_percent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_request public.discount_approval_requests%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_max_allowed_percent numeric;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF p_expected_quote_row_version IS NULL
     OR p_requested_discount_percent IS NULL
     OR p_requested_discount_percent < 0
     OR p_requested_discount_percent > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de aprovação inválidos.';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento não encontrado.';
  END IF;
  IF v_quote.seller_id IS DISTINCT FROM v_actor_id
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.status::text NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento não pode solicitar aprovação neste estado.';
  END IF;
  IF p_requested_discount_percent IS DISTINCT FROM v_quote.real_discount_percent THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O percentual solicitado deve corresponder ao desconto real do orçamento.';
  END IF;

  SELECT max_discount_percent INTO v_max_allowed_percent
  FROM public.seller_discount_limits
  WHERE user_id = v_actor_id;
  IF v_max_allowed_percent IS NULL OR v_max_allowed_percent < 0 OR v_max_allowed_percent > 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Limite de desconto do vendedor não configurado.';
  END IF;
  IF p_requested_discount_percent <= v_max_allowed_percent THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O desconto não exige aprovação adicional.';
  END IF;

  INSERT INTO public.discount_approval_requests (
    quote_id, seller_id, requested_discount_percent, max_allowed_percent,
    seller_notes, requested_quote_row_version, requested_real_discount_percent
  ) VALUES (
    p_quote_id, v_actor_id, p_requested_discount_percent, v_max_allowed_percent,
    p_seller_notes, v_quote.row_version, v_quote.real_discount_percent
  ) RETURNING * INTO v_request;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes
  SET status = 'pending_approval', row_version = row_version + 1, updated_at = now()
  WHERE id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, v_actor_id, 'discount_approval_requested',
    format('Solicitação de desconto real de %s%%', p_requested_discount_percent),
    'status', v_quote.status::text, 'pending_approval',
    jsonb_build_object('request_id', v_request.id, 'max_allowed_percent', v_max_allowed_percent,
      'requested_quote_row_version', v_quote.row_version,
      'requested_real_discount_percent', v_quote.real_discount_percent)
  );

  RETURN QUERY SELECT v_request.id, v_updated.id, v_request.seller_id,
    v_updated.row_version, v_request.requested_discount_percent,
    v_request.max_allowed_percent, v_quote.negotiation_markup_percent,
    v_quote.real_discount_percent;
END;
$function$
