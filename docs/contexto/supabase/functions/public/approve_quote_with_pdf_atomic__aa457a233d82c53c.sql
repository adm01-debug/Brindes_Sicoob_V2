CREATE OR REPLACE FUNCTION public.approve_quote_with_pdf_atomic(p_quote_id uuid, p_expected_quote_row_version integer, p_approved_pdf_url text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, status text, row_version integer, approved_pdf_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT result.id, result.status, result.row_version, result.approved_pdf_url
    FROM public.approve_quote_with_pdf_atomic_core_20261013(
      p_quote_id, p_expected_quote_row_version, p_approved_pdf_url, p_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$
