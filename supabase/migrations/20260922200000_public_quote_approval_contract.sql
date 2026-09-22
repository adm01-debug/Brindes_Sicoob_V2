-- Aprovação pública do orçamento local: leitura mínima e resposta transacional.
-- O catálogo externo não participa desta operação.
ALTER TABLE public.quote_approval_tokens
  ADD COLUMN IF NOT EXISTS signature_data_url text;

-- version identifica uma versão comercial da família; row_version já controla
-- alterações da linha. Aprovar não deve criar uma nova versão comercial.
DROP TRIGGER IF EXISTS trg_quotes_increment_version ON public.quotes;

CREATE OR REPLACE FUNCTION public.guard_local_quote_approval_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'responded', 'expired', 'revoked') THEN
    RAISE EXCEPTION 'Status de link inválido.' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id::text = NEW.quote_id AND q.seller_id = NEW.seller_id
        AND q.deleted_at IS NULL AND q.is_latest_version
    ) THEN
      RAISE EXCEPTION 'Orçamento indisponível para emissão deste link.' USING ERRCODE = '42501';
    END IF;
  ELSIF (NEW.quote_id, NEW.seller_id, NEW.token) IS DISTINCT FROM
        (OLD.quote_id, OLD.seller_id, OLD.token) THEN
    RAISE EXCEPTION 'O destino e o titular do link são imutáveis.' USING ERRCODE = '23514';
  END IF;

  -- Invocador: dentro da RPC SECURITY DEFINER, current_user é o dono da RPC.
  -- Clientes autenticados podem emitir/revogar, mas não forjar uma resposta.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'active' OR NEW.response IS NOT NULL OR NEW.responded_at IS NOT NULL
         OR NEW.signer_name IS NOT NULL OR NEW.signer_document IS NOT NULL
         OR NEW.signed_at IS NOT NULL OR NEW.signature_data_url IS NOT NULL
         OR NEW.signature_hash IS NOT NULL THEN
        RAISE EXCEPTION 'Uma resposta só pode ser registrada pelo fluxo público.' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.status NOT IN ('expired', 'revoked') OR OLD.status <> 'active'
         OR (NEW.response, NEW.response_notes, NEW.responded_at, NEW.signer_name,
             NEW.signer_document, NEW.signer_ip, NEW.signer_user_agent,
             NEW.signed_at, NEW.signature_hash, NEW.signature_data_url)
            IS DISTINCT FROM
            (OLD.response, OLD.response_notes, OLD.responded_at, OLD.signer_name,
             OLD.signer_document, OLD.signer_ip, OLD.signer_user_agent,
             OLD.signed_at, OLD.signature_hash, OLD.signature_data_url) THEN
        RAISE EXCEPTION 'O cliente só pode revogar um link ativo.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_local_quote_approval_token() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validate_approval_token_status ON public.quote_approval_tokens;
CREATE TRIGGER trg_validate_approval_token_status BEFORE INSERT OR UPDATE
ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.guard_local_quote_approval_token();

-- O status e responded_at impedem reutilização; preservar a validade original
-- permite recarregar a confirmação enquanto o link ainda está vigente.
CREATE OR REPLACE FUNCTION public.invalidate_used_approval_token()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.invalidate_used_approval_token() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_quote_approval(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'quote_number', q.quote_number, 'client_name', q.client_name,
    'total', q.total, 'valid_until', q.valid_until, 'status', t.status,
    'response', t.response, 'responded_at', t.responded_at, 'expires_at', t.expires_at
  )
  FROM public.quote_approval_tokens t JOIN public.quotes q
    ON q.id::text = t.quote_id AND q.seller_id = t.seller_id
  WHERE t.token = _token AND t.status IN ('active', 'responded')
    AND (t.expires_at IS NULL OR t.expires_at > statement_timestamp())
    AND q.deleted_at IS NULL AND q.is_latest_version
    AND (q.valid_until IS NULL OR q.valid_until::date >= CURRENT_DATE)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_quote_approval(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote_approval(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_local_quote_approval_response(
  _token text, _response text, _response_notes text,
  _signer_name text, _signer_document text, _signature_data_url text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token public.quote_approval_tokens%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF _response IS NULL OR _response NOT IN ('approved', 'rejected')
     OR length(_response_notes) > 2000 THEN
    RAISE EXCEPTION 'Resposta inválida.' USING ERRCODE = '22023';
  END IF;
  -- Ordem única: orçamento antes do token, inclusive com links diferentes.
  SELECT q.* INTO v_quote FROM public.quotes q
    JOIN public.quote_approval_tokens t ON q.id::text = t.quote_id
    WHERE t.token = _token FOR UPDATE OF q;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_token FROM public.quote_approval_tokens WHERE token = _token FOR UPDATE;
  v_now := clock_timestamp(); -- inclui o tempo de espera pelo lock
  IF NOT FOUND OR v_token.status <> 'active' OR v_token.responded_at IS NOT NULL
     OR (v_token.expires_at IS NOT NULL AND v_token.expires_at <= v_now)
     OR v_quote.seller_id <> v_token.seller_id OR v_quote.deleted_at IS NOT NULL
     OR NOT v_quote.is_latest_version OR v_quote.status NOT IN ('draft', 'pending', 'sent', 'viewed', 'revision') THEN
    RETURN false;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until::date < CURRENT_DATE THEN RETURN false; END IF;
  UPDATE public.quotes SET status = _response, client_response = _response,
    client_response_at = v_now, client_response_notes = _response_notes
    WHERE id = v_quote.id;
  UPDATE public.quote_approval_tokens SET status = 'responded', response = _response,
    response_notes = _response_notes, responded_at = v_now, updated_at = v_now,
    signer_name = _signer_name, signer_document = _signer_document,
    signed_at = CASE WHEN _signature_data_url IS NOT NULL THEN v_now END,
    signature_data_url = _signature_data_url,
    signature_hash = CASE WHEN _signature_data_url IS NOT NULL
      THEN encode(sha256(convert_to(_signature_data_url, 'UTF8')), 'hex') END
    WHERE id = v_token.id;
  INSERT INTO public.quote_history(quote_id, user_id, action, description)
    VALUES (v_quote.id, v_quote.seller_id, 'public_response',
      CASE _response WHEN 'approved' THEN 'Orçamento aprovado pelo link público.'
      ELSE 'Orçamento recusado pelo link público.' END);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_quote_response(_token text, _response text, _response_notes text DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.apply_local_quote_approval_response(_token, _response, _response_notes, NULL, NULL, NULL);
$$;
REVOKE ALL ON FUNCTION public.submit_quote_response(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quote_response(text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_signed_quote_response(
  _token text, _response text, _signer_name text, _signer_document text, _signature_data_url text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _signer_name IS NULL OR length(btrim(_signer_name)) NOT BETWEEN 2 AND 200
     OR _signer_document IS NULL OR _signer_document !~ '^([0-9]{11}|[0-9]{14})$'
     OR _signature_data_url IS NULL OR length(_signature_data_url) NOT BETWEEN 40 AND 262144
     OR _signature_data_url !~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$' THEN
    RAISE EXCEPTION 'Dados da assinatura inválidos.' USING ERRCODE = '22023';
  END IF;
  RETURN public.apply_local_quote_approval_response(_token, _response, NULL,
    btrim(_signer_name), _signer_document, _signature_data_url);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_signed_quote_response(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_signed_quote_response(text,text,text,text,text) TO anon, authenticated, service_role;

-- Compatibilidade de leitura: não devolver documento, assinatura, IP ou email
-- pela antiga RPC que retorna o tipo completo da tabela.
CREATE OR REPLACE FUNCTION public.get_quote_token_by_value(_token text)
RETURNS SETOF public.quote_approval_tokens LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_safe public.quote_approval_tokens%ROWTYPE;
BEGIN
  SELECT t.id, t.quote_id, t.status, t.expires_at, t.responded_at, t.response
    INTO v_safe.id, v_safe.quote_id, v_safe.status, v_safe.expires_at, v_safe.responded_at, v_safe.response
    FROM public.quote_approval_tokens t
    WHERE t.token = _token AND public.get_public_quote_approval(_token) IS NOT NULL;
  IF FOUND THEN RETURN NEXT v_safe; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_quote_token_by_value(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quote_token_by_value(text) TO anon, authenticated, service_role;

-- Acrescenta somente as assinaturas públicas revisadas ao gate já aplicado.
DO $audit$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.audit_security_definer_acl()'::regprocedure) INTO v_definition;
  IF position('public.get_public_quote_approval(text)' IN v_definition) = 0 THEN
    IF position('public.submit_quote_response(text,text,text)' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Versão inesperada do gate ACL; revisar antes de aplicar.';
    END IF;
    EXECUTE replace(v_definition, '''public.submit_quote_response(text,text,text)''',
      '''public.submit_quote_response(text,text,text)'', ''public.get_public_quote_approval(text)'', ''public.submit_signed_quote_response(text,text,text,text,text)''');
  END IF;
END;
$audit$;
