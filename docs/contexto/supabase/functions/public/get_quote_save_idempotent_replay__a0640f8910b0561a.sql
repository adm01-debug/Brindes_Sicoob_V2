CREATE OR REPLACE FUNCTION public.get_quote_save_idempotent_replay(p_idempotency_key uuid, p_quote jsonb, p_items jsonb, p_history jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payload_hash text;
  v_legacy_hash text;
  v_existing public.quote_save_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL
     OR jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_history, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A consulta de idempotência é inválida.';
  END IF;

  v_payload_hash := encode(
    extensions.digest(
      p_quote::text || E'\x1f' || COALESCE(p_items, '[]'::jsonb)::text
        || E'\x1f' || COALESCE(p_history, '[]'::jsonb)::text,
      'sha256'
    ),
    'hex'
  );
  v_legacy_hash := md5(p_quote::text || ':' || COALESCE(p_items, '[]'::jsonb)::text);

  SELECT * INTO v_existing
    FROM public.quote_save_idempotency
   WHERE actor_id = v_actor_id
     AND idempotency_key = p_idempotency_key;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF (length(v_existing.payload_hash) = 32 AND v_existing.payload_hash IS DISTINCT FROM v_legacy_hash)
     OR (length(v_existing.payload_hash) = 64 AND v_existing.payload_hash IS DISTINCT FROM v_payload_hash) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;

  SELECT to_jsonb(q) INTO v_result
    FROM public.quotes AS q
   WHERE q.id = v_existing.quote_id
     AND q.deleted_at IS NULL;
  IF v_result IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O orçamento associado à chave de idempotência não está disponível.';
  END IF;
  RETURN v_result;
END;
$function$
