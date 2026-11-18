CREATE OR REPLACE FUNCTION public.respond_discount_approval_atomic_core_20261013(p_request_id uuid, p_expected_quote_row_version integer, p_approved boolean, p_admin_notes text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid, quote_id uuid, seller_id uuid, quote_row_version integer, requested_discount_percent numeric, max_allowed_percent numeric, request_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.discount_approval_requests%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_new_status text := CASE WHEN p_approved THEN 'pending' ELSE 'draft' END;
BEGIN
  IF v_actor_id IS NULL OR p_expected_quote_row_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação e versão esperada são obrigatórias.';
  END IF;

  SELECT * INTO v_request FROM public.discount_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação de desconto não encontrada.';
  END IF;
  SELECT * INTO v_quote FROM public.quotes WHERE id = v_request.quote_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_quote_scope(v_actor_id, v_request.quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem alçada para responder esta solicitação.';
  END IF;
  SELECT * INTO v_request FROM public.discount_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.status <> 'pending'
     OR v_quote.status::text <> 'pending_approval'
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.real_discount_percent IS DISTINCT FROM v_request.requested_real_discount_percent
     OR v_request.requested_quote_row_version + 1 IS DISTINCT FROM v_quote.row_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A solicitação não corresponde mais ao orçamento atual.';
  END IF;

  UPDATE public.discount_approval_requests
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      admin_id = v_actor_id, admin_notes = p_admin_notes, responded_at = now(),
      approved_quote_row_version = CASE WHEN p_approved THEN v_quote.row_version + 1 ELSE NULL END,
      updated_at = now()
  WHERE id = p_request_id;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  PERFORM set_config('app.quote_discount_approval_commit', 'true', true);
  UPDATE public.quotes
  SET status = v_new_status::public.quote_status, row_version = row_version + 1, updated_at = now()
  WHERE id = v_quote.id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_quote.id, v_actor_id,
    CASE WHEN p_approved THEN 'discount_approved' ELSE 'discount_rejected' END,
    CASE WHEN p_approved THEN 'Desconto aprovado pelo responsável' ELSE 'Desconto rejeitado pelo responsável' END,
    'status', 'pending_approval', v_new_status,
    jsonb_build_object('request_id', v_request.id, 'admin_notes', p_admin_notes)
  );

  RETURN QUERY SELECT v_request.id, v_updated.id, v_request.seller_id,
    v_updated.row_version, v_request.requested_discount_percent,
    v_request.max_allowed_percent, CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
END;
$function$
