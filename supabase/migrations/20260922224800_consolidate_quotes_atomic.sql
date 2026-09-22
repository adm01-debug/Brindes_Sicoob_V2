CREATE OR REPLACE FUNCTION public.consolidate_sicoob_quotes(
  p_singular_id uuid,
  p_quote_ids uuid[],
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_expected integer;
  v_locked integer;
  v_updated integer;
  v_consolidation public.quote_consolidations%ROWTYPE;
BEGIN
  v_expected := COALESCE(cardinality(ARRAY(SELECT DISTINCT unnest(p_quote_ids))), 0);
  IF v_actor IS NULL OR p_singular_id IS NULL OR v_expected = 0 OR v_expected > 500 THEN
    RAISE EXCEPTION 'Ator, Singular e de 1 a 500 orçamentos são obrigatórios.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE (p.user_id = v_actor OR p.id = v_actor)
      AND p.role::text IN ('gestor_compras', 'comprador_singular', 'admin', 'dev')
      AND (p.role::text IN ('admin', 'dev') OR p.cooperativa_id = p_singular_id)
  ) THEN
    RAISE EXCEPTION 'Usuário fora da alçada da Singular.' USING ERRCODE = '42501';
  END IF;

  PERFORM id FROM public.quotes
  WHERE id = ANY(p_quote_ids)
  ORDER BY id
  FOR UPDATE;
  GET DIAGNOSTICS v_locked = ROW_COUNT;
  IF v_locked <> v_expected OR EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = ANY(p_quote_ids)
      AND (q.singular_id IS DISTINCT FROM p_singular_id
        OR q.status <> 'approved_singular'
        OR q.consolidation_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Orçamentos inexistentes, fora da Singular, inelegíveis ou já consolidados.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.quote_consolidations(consolidated_by, singular_id, status, notes)
  VALUES (v_actor, p_singular_id, 'pending', NULLIF(btrim(p_notes), ''))
  RETURNING * INTO v_consolidation;

  UPDATE public.quotes
  SET consolidation_id = v_consolidation.id, updated_at = clock_timestamp()
  WHERE id = ANY(p_quote_ids)
    AND singular_id = p_singular_id
    AND status = 'approved_singular'
    AND consolidation_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> v_expected THEN
    RAISE EXCEPTION 'Concorrência detectada ao consolidar orçamentos.' USING ERRCODE = '40001';
  END IF;

  RETURN to_jsonb(v_consolidation);
END;
$function$;

REVOKE ALL ON FUNCTION public.consolidate_sicoob_quotes(uuid,uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consolidate_sicoob_quotes(uuid,uuid[],text) TO authenticated;
