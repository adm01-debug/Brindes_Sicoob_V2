-- Endurece o ledger de idempotência sem alterar a migration histórica que o
-- criou. Hashes MD5 já persistidos continuam válidos somente para retries
-- legados; novas operações incluem cabeçalho, itens e histórico em SHA-256.

ALTER TABLE public.quote_save_idempotency
  DROP CONSTRAINT IF EXISTS quote_save_idempotency_payload_hash_check;

ALTER TABLE public.quote_save_idempotency
  ADD CONSTRAINT quote_save_idempotency_payload_hash_check
  CHECK (length(payload_hash) IN (32, 64));

DROP POLICY IF EXISTS quote_save_idempotency_actor_only
  ON public.quote_save_idempotency;
DROP POLICY IF EXISTS quote_save_idempotency_select_own
  ON public.quote_save_idempotency;
DROP POLICY IF EXISTS quote_save_idempotency_insert_own
  ON public.quote_save_idempotency;

CREATE POLICY quote_save_idempotency_select_own
  ON public.quote_save_idempotency
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = actor_id);

CREATE POLICY quote_save_idempotency_insert_own
  ON public.quote_save_idempotency
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = actor_id
    AND EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_id
        AND q.seller_id = (SELECT auth.uid())
    )
  );

GRANT USAGE ON SCHEMA extensions TO authenticated;

CREATE OR REPLACE FUNCTION public.save_quote_atomic_idempotent(
  p_quote jsonb,
  p_items jsonb,
  p_idempotency_key uuid,
  p_history jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payload_hash text;
  v_legacy_hash text;
  v_existing public.quote_save_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário autenticado e chave de idempotência são obrigatórios.';
  END IF;
  IF jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_history, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cabeçalho, itens ou histórico do orçamento são inválidos.';
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

  PERFORM pg_advisory_xact_lock(
    hashtextextended('quote-save:' || v_actor_id::text || ':' || p_idempotency_key::text, 0)
  );

  SELECT * INTO v_existing
    FROM public.quote_save_idempotency
   WHERE actor_id = v_actor_id
     AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF (length(v_existing.payload_hash) = 32 AND v_existing.payload_hash IS DISTINCT FROM v_legacy_hash)
       OR (length(v_existing.payload_hash) = 64 AND v_existing.payload_hash IS DISTINCT FROM v_payload_hash) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT to_jsonb(q) INTO v_result
    FROM public.quotes q
    WHERE q.id = v_existing.quote_id;
    IF v_result IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O orçamento associado à chave de idempotência não está disponível.';
    END IF;
    RETURN v_result;
  END IF;

  v_result := public.save_quote_atomic(p_quote, p_items, NULL, NULL, p_history);
  INSERT INTO public.quote_save_idempotency (actor_id, idempotency_key, payload_hash, quote_id)
  VALUES (v_actor_id, p_idempotency_key, v_payload_hash, (v_result ->> 'id')::uuid);

  RETURN v_result;
END;
$function$;

REVOKE ALL ON TABLE public.quote_save_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.quote_save_idempotency TO authenticated;
REVOKE ALL ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb) IS
  'Cria orçamento uma única vez por ator, chave, conteúdo e histórico, preservando retries legados.';
