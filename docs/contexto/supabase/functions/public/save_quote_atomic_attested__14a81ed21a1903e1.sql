CREATE OR REPLACE FUNCTION public.save_quote_atomic_attested(p_quote jsonb, p_items jsonb, p_quote_id uuid DEFAULT NULL::uuid, p_expected_row_version integer DEFAULT NULL::integer, p_history jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_attestation_id uuid := NULLIF(p_quote ->> 'price_attestation_id', '')::uuid;
  v_quote jsonb := p_quote - 'price_attestation_id';
  v_history jsonb := COALESCE(p_history, '[]'::jsonb);
BEGIN
  IF v_attestation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento precisa de um atestado de preço do catálogo.';
  END IF;
  PERFORM public.consume_quote_price_attestation(
    v_attestation_id, auth.uid(), p_quote_id, p_expected_row_version,
    v_quote, p_items, v_history
  );
  PERFORM set_config('app.quote_price_attestation_id', v_attestation_id::text, true);
  RETURN public.save_quote_atomic(v_quote, p_items, p_quote_id, p_expected_row_version, v_history);
END;
$function$
