CREATE OR REPLACE FUNCTION public.request_discount_approval_atomic(p_quote_id uuid, p_expected_quote_row_version integer, p_requested_discount_percent numeric, p_seller_notes text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid, quote_id uuid, seller_id uuid, quote_row_version integer, requested_discount_percent numeric, max_allowed_percent numeric, negotiation_markup_percent numeric, real_discount_percent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT
      result.request_id, result.quote_id, result.seller_id, result.quote_row_version,
      result.requested_discount_percent, result.max_allowed_percent,
      result.negotiation_markup_percent, result.real_discount_percent
    FROM public.request_discount_approval_atomic_core_20261013(
      p_quote_id, p_expected_quote_row_version,
      p_requested_discount_percent, p_seller_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$
