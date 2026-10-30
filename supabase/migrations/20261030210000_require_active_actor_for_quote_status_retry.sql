-- A autorização do vendedor por seller_id só é válida enquanto o vínculo
-- institucional permanece ativo. A verificação deve preceder o núcleo, que
-- pode retornar cedo quando o status solicitado já está confirmado.
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
$function$;

REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) IS
  'Exige ator com vínculo ativo antes de delegar ao núcleo de transição, inclusive em retries idempotentes.';
