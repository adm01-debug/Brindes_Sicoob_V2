-- Aprovação final e vínculo do documento assinado precisam ser inseparáveis.
-- O upload no Storage é externo à transação; esta função só publica a URL
-- depois que a autorização, a versão e o histórico forem validados.

CREATE OR REPLACE FUNCTION public.approve_quote_with_pdf_atomic(
  p_quote_id uuid,
  p_expected_quote_row_version integer,
  p_approved_pdf_url text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer, approved_pdf_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF NOT public.can_manage_quotes(v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Apenas supervisores podem aprovar o orçamento.';
  END IF;
  IF p_expected_quote_row_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A versão esperada do orçamento é obrigatória.';
  END IF;
  IF p_approved_pdf_url IS NULL OR btrim(p_approved_pdf_url) = '' OR length(p_approved_pdf_url) > 2048 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A URL do PDF assinado é inválida.';
  END IF;

  SELECT * INTO v_quote
  FROM public.quotes
  WHERE quotes.id = p_quote_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento não encontrado.';
  END IF;
  IF v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O orçamento foi modificado. Recarregue antes de aprovar.';
  END IF;
  IF v_quote.status::text NOT IN ('pending', 'sent') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Somente orçamentos pendentes ou enviados podem ser aprovados com PDF.';
  END IF;

  UPDATE public.quotes AS q
  SET status = 'approved'::public.quote_status,
      approved_pdf_url = p_approved_pdf_url,
      approved_by = v_actor_id,
      approved_at = now(),
      row_version = q.row_version + 1,
      updated_at = now()
  WHERE q.id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_updated.id, v_actor_id, 'quote_approved_with_pdf',
    'Orçamento aprovado com PDF assinado', 'status', v_quote.status::text, 'approved',
    jsonb_build_object('approved_pdf_url', p_approved_pdf_url, 'notes', p_notes)
  );

  id := v_updated.id;
  status := v_updated.status::text;
  row_version := v_updated.row_version;
  approved_pdf_url := v_updated.approved_pdf_url;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text) IS
  'Aprova orçamento com PDF assinado, versão otimista e histórico na mesma transação.';
