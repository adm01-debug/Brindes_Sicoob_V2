CREATE OR REPLACE FUNCTION public.register_quote_price_attestation(p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Somente o serviço de preços pode emitir atestados.';
  END IF;
  IF p_actor_id IS NULL
     OR jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_history, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR (p_quote_id IS NULL AND p_expected_row_version IS NOT NULL)
     OR (p_quote_id IS NOT NULL AND COALESCE(p_expected_row_version, 0) <= 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O contexto do atestado de preço é inválido.';
  END IF;

  DELETE FROM private.quote_price_attestations
   WHERE expires_at < clock_timestamp() - interval '1 day';

  INSERT INTO private.quote_price_attestations (
    actor_id, quote_id, expected_row_version, payload_hash, expires_at
  ) VALUES (
    p_actor_id,
    p_quote_id,
    p_expected_row_version,
    private.quote_price_payload_hash(p_quote, p_items, p_history),
    clock_timestamp() + interval '5 minutes'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$
