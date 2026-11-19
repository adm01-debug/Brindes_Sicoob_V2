CREATE OR REPLACE FUNCTION public.consume_quote_price_attestation(p_attestation_id uuid, p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_call_context text;
  v_claimed_id uuid;
BEGIN
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'service_role')
     OR (auth.role() = 'authenticated'
         AND auth.uid() IS DISTINCT FROM p_actor_id)
     OR v_call_context !~ 'PL/pgSQL function (public\.)?save_quote_atomic(_idempotent)?_attested\(' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O atestado só pode ser consumido pelo salvamento autenticado.';
  END IF;

  UPDATE private.quote_price_attestations AS attestation
     SET consumed_at = clock_timestamp(),
         consumed_transaction_id = pg_current_xact_id()
   WHERE attestation.id = p_attestation_id
     AND attestation.actor_id = p_actor_id
     AND attestation.quote_id IS NOT DISTINCT FROM p_quote_id
     AND attestation.expected_row_version IS NOT DISTINCT FROM p_expected_row_version
     AND attestation.payload_hash = private.quote_price_payload_hash(p_quote, p_items, p_history)
     AND attestation.expires_at > clock_timestamp()
     AND attestation.consumed_at IS NULL
  RETURNING attestation.id INTO v_claimed_id;

  IF v_claimed_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O preço do orçamento não foi validado, expirou ou já foi utilizado.';
  END IF;
END;
$function$
