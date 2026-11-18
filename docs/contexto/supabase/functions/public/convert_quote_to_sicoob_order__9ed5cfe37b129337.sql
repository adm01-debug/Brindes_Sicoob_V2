CREATE OR REPLACE FUNCTION public.convert_quote_to_sicoob_order(p_quote_id uuid)
 RETURNS TABLE(id uuid, order_number text, status text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY
    SELECT result.id, result.order_number, result.status, result.total_amount
    FROM public.convert_quote_to_sicoob_order_core_20261013(p_quote_id) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$
