CREATE OR REPLACE FUNCTION public.bulk_update_quote_status_atomic(p_quote_ids uuid[], p_expected_row_versions integer[], p_status text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, status text, row_version integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_is_active(v_actor_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Somente usuários ativos podem alterar o status do orçamento.';
  END IF;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY
    SELECT result.id, result.status, result.row_version
    FROM public.bulk_update_quote_status_atomic_core_20261013(
      p_quote_ids, p_expected_row_versions, p_status, p_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$
