-- Uma repetição de criação (duplo clique, timeout ou retry do navegador) deve
-- devolver o mesmo orçamento. A chave pertence ao ator e também amarra o
-- conteúdo enviado, evitando reutilização acidental com outro documento.
CREATE TABLE public.quote_save_idempotency (
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, idempotency_key),
  CONSTRAINT quote_save_idempotency_payload_hash_check CHECK (length(payload_hash) = 32)
);

ALTER TABLE public.quote_save_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_save_idempotency_actor_only
  ON public.quote_save_idempotency
  FOR ALL TO authenticated
  USING (actor_id = auth.uid())
  WITH CHECK (actor_id = auth.uid());

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
  v_existing public.quote_save_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário autenticado e chave de idempotência são obrigatórios.';
  END IF;
  IF jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cabeçalho ou itens do orçamento são inválidos.';
  END IF;

  v_payload_hash := md5(p_quote::text || ':' || COALESCE(p_items, '[]'::jsonb)::text);
  PERFORM pg_advisory_xact_lock(
    hashtextextended('quote-save:' || v_actor_id::text || ':' || p_idempotency_key::text, 0)
  );

  SELECT * INTO v_existing
    FROM public.quote_save_idempotency
   WHERE actor_id = v_actor_id
     AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT to_jsonb(q) INTO v_result FROM public.quotes q WHERE q.id = v_existing.quote_id;
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

REVOKE ALL ON TABLE public.quote_save_idempotency FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_save_idempotency TO authenticated;
REVOKE ALL ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_quote_atomic_idempotent(jsonb, jsonb, uuid, jsonb) IS
  'Cria orçamento uma única vez por ator, chave e conteúdo, reaproveitando a resposta em retries.';
