CREATE OR REPLACE FUNCTION public.get_sicoob_kit_quote_idempotency(p_actor_id uuid, p_idempotency_key text, p_request_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_quote_number text;
  v_total numeric(14,2);
BEGIN
  IF p_actor_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  SELECT quote_number, total INTO v_quote_number, v_total
    FROM public.quotes WHERE id = v_existing.quote_id;
  RETURN jsonb_build_object(
    'quote_id', v_existing.quote_id,
    'quote_number', v_quote_number,
    'total', v_total
  );
END;
$function$
