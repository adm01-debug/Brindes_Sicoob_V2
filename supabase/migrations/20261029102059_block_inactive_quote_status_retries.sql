-- Revalida o ator antes do caminho idempotente. Uma conta desativada ainda
-- podia receber status/versão ao repetir o estado do orçamento que possuía.
CREATE OR REPLACE FUNCTION public.bulk_update_quote_status_atomic_core_20261013(
  p_quote_ids uuid[],
  p_expected_row_versions integer[],
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_index integer;
BEGIN
  IF v_actor_id IS NULL OR public.sicoob_actor_is_active(v_actor_id) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'O ator não está autorizado a transicionar orçamentos.';
  END IF;

  IF cardinality(p_quote_ids) IS NULL
     OR cardinality(p_quote_ids) NOT BETWEEN 1 AND 100
     OR cardinality(p_quote_ids) <> cardinality(p_expected_row_versions)
     OR p_status NOT IN (
       'draft', 'pending', 'sent', 'approved', 'rejected', 'expired',
       'pending_singular_approval',
       'approved_singular', 'rejected_singular'
     )
     OR (SELECT count(DISTINCT quote_id) FROM unnest(p_quote_ids) AS quote_id) <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de transição inválidos.';
  END IF;
  IF p_status = 'approved' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A aprovação final exige PDF assinado.';
  END IF;

  PERFORM 1 FROM public.quotes q WHERE q.id = ANY(p_quote_ids) ORDER BY q.id FOR UPDATE;
  IF (SELECT count(*) FROM public.quotes q WHERE q.id = ANY(p_quote_ids)) <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Um ou mais orçamentos não foram encontrados.';
  END IF;

  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_ids[v_index];
    IF NOT (
      v_quote.seller_id = v_actor_id
      OR public.can_manage_quote_scope(v_actor_id, v_quote.id)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Um ou mais orçamentos não estão no seu escopo.';
    END IF;

    IF v_quote.status::text = p_status THEN
      -- Um retry continua sem escrita, mas não pode confirmar um orçamento
      -- excluído ou uma versão que deixou de ser a versão mais recente.
      PERFORM public.assert_quote_transition(v_actor_id, v_quote, p_status);
      CONTINUE;
    END IF;
    IF v_quote.row_version IS DISTINCT FROM p_expected_row_versions[v_index] THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um ou mais orçamentos foram modificados.';
    END IF;
    PERFORM public.assert_quote_transition(v_actor_id, v_quote, p_status);
  END LOOP;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_ids[v_index];
    IF v_quote.status::text = p_status THEN
      RETURN QUERY SELECT v_quote.id, v_quote.status::text, v_quote.row_version;
      CONTINUE;
    END IF;

    UPDATE public.quotes q
    SET status = p_status::public.quote_status,
        rejection_notes = CASE WHEN p_status IN ('rejected', 'rejected_singular') THEN p_notes ELSE NULL END,
        approved_at = CASE WHEN p_status = 'approved_singular' THEN now() ELSE q.approved_at END,
        approved_by = CASE WHEN p_status = 'approved_singular' THEN v_actor_id ELSE q.approved_by END,
        row_version = q.row_version + 1,
        updated_at = now()
    WHERE q.id = v_quote.id
    RETURNING * INTO v_updated;

    INSERT INTO public.quote_history (
      quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
    ) VALUES (
      v_updated.id, v_actor_id, 'status_changed',
      format('Status alterado de "%s" para "%s"', v_quote.status, p_status),
      'status', v_quote.status, p_status, jsonb_build_object('notes', p_notes, 'bulk', true)
    );
    RETURN QUERY SELECT v_updated.id, v_updated.status::text, v_updated.row_version;
  END LOOP;
END;
$function$;

COMMENT ON FUNCTION public.bulk_update_quote_status_atomic_core_20261013(uuid[], integer[], text, text) IS
  'Exige ator ativo antes de qualquer retorno; revalidar retries idempotentes sem escrita ou exposição de orçamento inválido.';
