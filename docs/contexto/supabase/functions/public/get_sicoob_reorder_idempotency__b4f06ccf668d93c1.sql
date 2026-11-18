CREATE OR REPLACE FUNCTION public.get_sicoob_reorder_idempotency(p_actor_id uuid, p_order_id uuid, p_idempotency_key text, p_request_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.sicoob_reorder_requests%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;
  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = p_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  RETURN v_existing.quote_id;
END;
$function$
