-- O pedido de desconto, a mudança de status e a trilha do orçamento formam
-- uma única decisão de negócio. Estes contratos impedem que a UI deixe um
-- pedido pendente sem status correspondente, ou uma decisão sem histórico.

CREATE OR REPLACE FUNCTION public.request_discount_approval_atomic(
  p_quote_id uuid,
  p_expected_quote_row_version integer,
  p_requested_discount_percent numeric,
  p_seller_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid,
  quote_id uuid,
  seller_id uuid,
  quote_row_version integer,
  requested_discount_percent numeric,
  max_allowed_percent numeric,
  negotiation_markup_percent numeric,
  real_discount_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF p_expected_quote_row_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A versão esperada do orçamento é obrigatória.';
  END IF;
  IF p_requested_discount_percent IS NULL OR p_requested_discount_percent < 0 OR p_requested_discount_percent > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O percentual de desconto deve estar entre 0 e 100.';
  END IF;

  -- Toda mutação deste fluxo trava primeiro o orçamento; assim, pedido e
  -- resposta não podem intercalar versões ou gerar duas solicitações pendentes.
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE id = p_quote_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento não encontrado.';
  END IF;
  IF v_quote.seller_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode solicitar desconto para este orçamento.';
  END IF;
  SELECT max_discount_percent INTO v_max_allowed_percent
  FROM public.seller_discount_limits
  WHERE user_id = v_actor_id;
  IF v_max_allowed_percent IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Limite de desconto do vendedor não configurado.';
  END IF;
  IF v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O orçamento foi modificado. Recarregue antes de solicitar aprovação.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.discount_approval_requests AS dar
    WHERE dar.quote_id = p_quote_id AND dar.status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Já existe uma solicitação de desconto pendente para este orçamento.';
  END IF;
  IF v_quote.status::text NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O orçamento não está em um estado que aceite solicitação de desconto.';
  END IF;

  INSERT INTO public.discount_approval_requests (
    quote_id, seller_id, requested_discount_percent, max_allowed_percent, seller_notes
  ) VALUES (
    p_quote_id, v_actor_id, p_requested_discount_percent, v_max_allowed_percent, p_seller_notes
  )
  RETURNING * INTO v_request;

  UPDATE public.quotes
  SET status = 'pending_approval',
      row_version = COALESCE(row_version, 1) + 1,
      updated_at = now()
  WHERE id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, v_actor_id, 'discount_approval_requested',
    format('Solicitação de desconto de %s%% (limite %s%%)', p_requested_discount_percent, v_max_allowed_percent),
    'discount', NULL, format('%s%%', p_requested_discount_percent),
    jsonb_build_object(
      'seller_notes', p_seller_notes,
      'max_allowed_percent', v_max_allowed_percent,
      'apparent_discount_percent', v_quote.discount_percent,
      'real_discount_percent', v_quote.real_discount_percent,
      'negotiation_markup_percent', v_quote.negotiation_markup_percent,
      'request_id', v_request.id
    )
  );

  request_id := v_request.id;
  quote_id := v_updated.id;
  seller_id := v_request.seller_id;
  quote_row_version := v_updated.row_version;
  requested_discount_percent := v_request.requested_discount_percent;
  max_allowed_percent := v_request.max_allowed_percent;
  negotiation_markup_percent := v_quote.negotiation_markup_percent;
  real_discount_percent := v_quote.real_discount_percent;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_discount_approval_atomic(
  p_request_id uuid,
  p_expected_quote_row_version integer,
  p_approved boolean,
  p_admin_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid,
  quote_id uuid,
  seller_id uuid,
  quote_row_version integer,
  requested_discount_percent numeric,
  max_allowed_percent numeric,
  request_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.discount_approval_requests%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_new_status text := CASE WHEN p_approved THEN 'pending' ELSE 'draft' END;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF NOT public.can_approve_discount(v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Apenas supervisores podem responder solicitações de desconto.';
  END IF;
  IF p_expected_quote_row_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A versão esperada do orçamento é obrigatória.';
  END IF;

  -- Leitura inicial identifica o orçamento; o re-read abaixo acontece depois
  -- do lock do orçamento para manter a ordem de lock estável entre os fluxos.
  SELECT * INTO v_request
  FROM public.discount_approval_requests
  WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação de desconto não encontrada.';
  END IF;

  SELECT * INTO v_quote
  FROM public.quotes
  WHERE id = v_request.quote_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento da solicitação não encontrado.';
  END IF;

  SELECT * INTO v_request
  FROM public.discount_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Esta solicitação já foi respondida.';
  END IF;
  IF v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O orçamento foi modificado. Recarregue antes de responder a solicitação.';
  END IF;
  IF v_quote.status::text <> 'pending_approval' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O orçamento não está aguardando aprovação de desconto.';
  END IF;

  UPDATE public.discount_approval_requests
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      admin_id = v_actor_id,
      admin_notes = p_admin_notes,
      responded_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  UPDATE public.quotes
  SET status = v_new_status::public.quote_status,
      row_version = COALESCE(row_version, 1) + 1,
      updated_at = now()
  WHERE id = v_quote.id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_quote.id, v_actor_id,
    CASE WHEN p_approved THEN 'discount_approved' ELSE 'discount_rejected' END,
    CASE WHEN p_approved
      THEN format('Desconto de %s%% aprovado pelo supervisor', v_request.requested_discount_percent)
      ELSE format('Desconto de %s%% rejeitado pelo supervisor', v_request.requested_discount_percent)
    END,
    'discount', format('%s%%', v_request.max_allowed_percent), format('%s%%', v_request.requested_discount_percent),
    jsonb_build_object(
      'admin_notes', p_admin_notes,
      'request_id', v_request.id,
      'request_status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      'quote_status', v_new_status
    )
  );

  request_id := v_request.id;
  quote_id := v_updated.id;
  seller_id := v_request.seller_id;
  quote_row_version := v_updated.row_version;
  requested_discount_percent := v_request.requested_discount_percent;
  max_allowed_percent := v_request.max_allowed_percent;
  request_status := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text) IS
  'Cria solicitação de desconto, atualiza status e histórico do orçamento em uma transação. O limite é lido no banco.';
COMMENT ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text) IS
  'Decide solicitação de desconto, atualiza status e histórico do orçamento em uma transação.';
