CREATE OR REPLACE FUNCTION public.approve_quote_with_pdf_atomic_core_20261013(p_quote_id uuid, p_expected_quote_row_version integer, p_approved_pdf_url text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, status text, row_version integer, approved_pdf_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_expected_quote_row_version IS NULL
     OR p_approved_pdf_url IS NULL
     OR p_approved_pdf_url !~ '^quotes/[0-9a-fA-F-]+/[^/]+[.]pdf$'
     OR length(p_approved_pdf_url) > 1024 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de aprovação inválidos.';
  END IF;
  SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.can_manage_quote_scope(v_actor_id, p_quote_id)
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.status::text NOT IN ('pending', 'sent')
     OR v_quote.deleted_at IS NOT NULL
     OR COALESCE(v_quote.is_latest_version, true) IS NOT TRUE
     OR p_approved_pdf_url !~ ('^quotes/' || v_quote.id::text || '/') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento não pode ser aprovado com este documento.';
  END IF;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes
  SET status = 'approved', approved_pdf_url = p_approved_pdf_url,
      approved_by = v_actor_id, approved_at = now(),
      row_version = quotes.row_version + 1, updated_at = now()
  WHERE quotes.id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_updated.id, v_actor_id, 'quote_approved_with_pdf',
    'Orçamento aprovado com PDF assinado', 'status', v_quote.status::text, 'approved',
    jsonb_build_object('approved_pdf_path', p_approved_pdf_url, 'notes', p_notes)
  );
  RETURN QUERY SELECT v_updated.id, v_updated.status::text, v_updated.row_version, v_updated.approved_pdf_url;
END;
$function$
