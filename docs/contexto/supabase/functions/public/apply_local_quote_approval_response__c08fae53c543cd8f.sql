CREATE OR REPLACE FUNCTION public.apply_local_quote_approval_response(_token text, _response text, _response_notes text, _signer_name text, _signer_document text, _signature_data_url text, _signer_ip text, _signer_user_agent text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
  v_result boolean;
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    v_result := public.apply_local_quote_approval_response_core_20261013(
      _token,
      _response,
      _response_notes,
      _signer_name,
      _signer_document,
      _signature_data_url,
      _signer_ip,
      _signer_user_agent
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
  RETURN v_result;
END;
$function$
