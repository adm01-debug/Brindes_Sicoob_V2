-- Atualização em lote precisa alterar cabeçalho e histórico no mesmo commit.
-- O frontend envia a versão que leu; conflito, perda de escopo ou ID inválido
-- aborta o lote inteiro antes de escrever a primeira linha.
CREATE OR REPLACE FUNCTION public.bulk_update_quote_status_atomic(
  p_quote_ids uuid[],
  p_expected_row_versions integer[],
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_index integer;
  v_count integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF cardinality(p_quote_ids) IS NULL OR cardinality(p_quote_ids) = 0 OR cardinality(p_quote_ids) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O lote deve conter entre 1 e 100 orçamentos.';
  END IF;
  IF cardinality(p_expected_row_versions) IS NULL
     OR cardinality(p_quote_ids) <> cardinality(p_expected_row_versions) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cada orçamento deve informar sua versão esperada.';
  END IF;
  IF (SELECT count(DISTINCT quote_id) FROM unnest(p_quote_ids) AS quote_id) <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O lote não pode conter orçamentos repetidos.';
  END IF;
  IF p_status NOT IN (
    'draft', 'pending', 'sent', 'approved', 'rejected', 'expired',
    'pending_approval', 'pending_singular_approval', 'approved_singular', 'rejected_singular'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Status de orçamento inválido.';
  END IF;
  IF p_status IN ('approved', 'rejected', 'approved_singular', 'rejected_singular')
     AND NOT public.can_manage_quotes(v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Apenas supervisores podem aprovar ou rejeitar orçamentos.';
  END IF;

  SELECT count(*) INTO v_count FROM public.quotes WHERE quotes.id = ANY(p_quote_ids);
  IF v_count <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Um ou mais orçamentos não foram encontrados.';
  END IF;

  -- Adquire todos os locks numa ordem estável antes de validar versões.
  PERFORM 1 FROM public.quotes WHERE quotes.id = ANY(p_quote_ids) ORDER BY quotes.id FOR UPDATE;

  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    SELECT * INTO v_quote FROM public.quotes WHERE quotes.id = p_quote_ids[v_index];
    IF NOT (v_quote.seller_id = v_actor_id OR public.can_manage_quotes(v_actor_id)) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Um ou mais orçamentos não estão no seu escopo.';
    END IF;
    IF v_quote.row_version IS DISTINCT FROM p_expected_row_versions[v_index] THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um ou mais orçamentos foram modificados. Recarregue a lista antes de tentar novamente.';
    END IF;
  END LOOP;

  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    UPDATE public.quotes AS q
    SET status = p_status,
        rejection_notes = COALESCE(p_notes, q.rejection_notes),
        approved_at = CASE WHEN p_status IN ('approved', 'approved_singular') THEN now() ELSE q.approved_at END,
        approved_by = CASE WHEN p_status IN ('approved', 'approved_singular') THEN v_actor_id ELSE q.approved_by END,
        row_version = q.row_version + 1,
        updated_at = now()
    WHERE q.id = p_quote_ids[v_index]
    RETURNING * INTO v_updated;

    INSERT INTO public.quote_history (quote_id, user_id, action, description, field_changed, old_value, new_value, metadata)
    VALUES (
      v_updated.id, v_actor_id, 'status_changed',
      format('Status alterado em lote de "%s" para "%s"', v_quote.status, p_status),
      'status', v_quote.status, p_status,
      jsonb_build_object('notes', p_notes, 'bulk', true)
    );

    id := v_updated.id;
    status := v_updated.status;
    row_version := v_updated.row_version;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) TO authenticated;

COMMENT ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) IS
  'Atualiza em lote status e histórico de orçamentos com lock, escopo e versão otimista.';
