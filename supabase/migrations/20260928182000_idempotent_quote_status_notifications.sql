-- A transição de status deve ser idempotente quando o cliente perde a
-- resposta depois do commit. O aviso aos compradores da Singular também
-- precisa nascer na mesma transação do status, sem depender do navegador.

CREATE OR REPLACE FUNCTION public.bulk_update_quote_status_atomic(
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
  IF v_actor_id IS NULL
     OR cardinality(p_quote_ids) IS NULL
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
    -- Autoriza antes de qualquer retorno idempotente. Sem esta verificação,
    -- um ator fora do escopo consegue confirmar existência, status e versão.
    IF NOT (
      v_quote.seller_id = v_actor_id
      OR public.can_manage_quote_scope(v_actor_id, v_quote.id)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Um ou mais orçamentos não estão no seu escopo.';
    END IF;
    -- Retry da mesma intenção: devolve o estado confirmado sem nova escrita.
    IF v_quote.status::text = p_status THEN
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

CREATE OR REPLACE FUNCTION public.notify_singular_quote_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF OLD.status::text IS NOT DISTINCT FROM NEW.status::text
     OR NEW.status::text <> 'pending_singular_approval' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (
    user_id, title, message, type, category, action_url, metadata
  )
  SELECT DISTINCT
    p.user_id,
    'Nova solicitação de PAC',
    format('O PAC enviou o orçamento %s para aprovação.', NEW.quote_number),
    'info',
    'approval',
    '/orcamentos/' || NEW.id::text,
    jsonb_build_object('quote_id', NEW.id, 'status', NEW.status::text)
  FROM public.profiles p
  WHERE p.cooperativa_id = NEW.singular_id
    AND p.role IN ('gestor_compras', 'comprador_singular')
    AND p.user_id IS NOT NULL;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_singular_quote_submission ON public.quotes;
CREATE TRIGGER trg_notify_singular_quote_submission
AFTER UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_singular_quote_submission();

REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  TO authenticated;
-- Função auxiliar interna: parâmetros compostos fornecidos pelo cliente não
-- podem ser usados como um oráculo de autorização.
REVOKE ALL ON FUNCTION public.assert_quote_transition(uuid, public.quotes, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_singular_quote_submission() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) IS
  'Transiciona orçamentos sob lock; retry do status já confirmado não grava versão ou histórico novamente.';
COMMENT ON FUNCTION public.notify_singular_quote_submission() IS
  'Registra atomicamente o aviso in-app aos compradores quando um PAC solicita aprovação.';
