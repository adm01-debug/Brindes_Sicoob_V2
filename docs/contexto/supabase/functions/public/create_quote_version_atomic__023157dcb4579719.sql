CREATE OR REPLACE FUNCTION public.create_quote_version_atomic(p_source_quote_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
  v_result uuid;
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    v_result := public.create_quote_version_atomic_core_20261013(p_source_quote_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
  RETURN v_result;
END;
$function$
