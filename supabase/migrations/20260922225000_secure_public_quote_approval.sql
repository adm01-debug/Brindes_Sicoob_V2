-- Fecha o acesso direto às RPCs públicas, aplica rate limit distribuído pela
-- Edge Function e registra uma evidência canônica assinada com chave do Vault.
CREATE TABLE public.quote_approval_evidence_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_secret_name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  retired_at timestamptz,
  CONSTRAINT quote_approval_evidence_key_lifecycle CHECK (
    (is_active AND retired_at IS NULL) OR (NOT is_active AND retired_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX quote_approval_evidence_one_active_key
  ON public.quote_approval_evidence_keys(is_active) WHERE is_active;
ALTER TABLE public.quote_approval_evidence_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_approval_evidence_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quote_approval_evidence_keys TO service_role;
INSERT INTO public.quote_approval_evidence_keys(vault_secret_name,is_active)
VALUES ('quote_approval_evidence_hmac',true);

ALTER TABLE public.quote_approval_tokens
  ADD COLUMN signature_evidence jsonb,
  ADD COLUMN signature_key_id uuid REFERENCES public.quote_approval_evidence_keys(id),
  ADD COLUMN signature_algorithm text;

ALTER TABLE public.quote_approval_tokens
  ADD CONSTRAINT quote_approval_signature_evidence_check CHECK (
    (signature_data_url IS NULL
      AND signature_evidence IS NULL
      AND signature_key_id IS NULL
      AND signature_algorithm IS NULL)
    OR
    (signature_data_url IS NOT NULL
      AND signature_hash ~ '^[0-9a-f]{64}$'
      AND jsonb_typeof(signature_evidence) = 'object'
      AND signature_key_id IS NOT NULL
      AND signature_algorithm = 'hmac-sha256-v1')
  ) NOT VALID;

COMMENT ON COLUMN public.quote_approval_tokens.signature_hash IS
'Novas respostas: HMAC-SHA-256 do payload canônico com chave versionada no Vault; registros anteriores preservam o digest legado.';
COMMENT ON COLUMN public.quote_approval_tokens.signature_evidence IS
'Payload canônico v1: snapshot comercial completo, decisão, signatário, instante, origem e digest da imagem.';

CREATE FUNCTION public.quote_approval_content_snapshot(p_quote_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'quote_id', q.id,
    'quote_number', q.quote_number,
    'version', q.version,
    'row_version', q.row_version,
    'client_name', q.client_name,
    'currency', to_jsonb(q)->'currency',
    'subtotal', to_jsonb(q)->'subtotal',
    'discount_amount', to_jsonb(q)->'discount_amount',
    'shipping_cost', to_jsonb(q)->'shipping_cost',
    'total', q.total,
    'valid_until', q.valid_until,
    'payment_terms', to_jsonb(q)->'payment_terms',
    'delivery_time', to_jsonb(q)->'delivery_time',
    'notes', to_jsonb(q)->'notes',
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', qi.id,
        'product_id', qi.product_id,
        'product_name', qi.product_name,
        'product_sku', qi.product_sku,
        'variant_id', to_jsonb(qi)->'source_variant_id',
        'variant_sku', to_jsonb(qi)->'source_variant_sku',
        'color_name', qi.color_name,
        'color_hex', qi.color_hex,
        'size_code', to_jsonb(qi)->'size_code',
        'quantity', qi.quantity,
        'unit_price', qi.unit_price,
        'subtotal', qi.subtotal,
        'notes', qi.notes,
        'personalizations', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', qip.id,
            'technique_id', qip.technique_id,
            'colors_count', qip.colors_count,
            'positions_count', qip.positions_count,
            'area_cm2', qip.area_cm2,
            'setup_cost', qip.setup_cost,
            'unit_cost', qip.unit_cost,
            'total_cost', qip.total_cost,
            'notes', qip.notes
          ) ORDER BY qip.id)
          FROM public.quote_item_personalizations qip
          WHERE qip.quote_item_id=qi.id
        ), '[]'::jsonb)
      ) ORDER BY COALESCE((to_jsonb(qi)->>'display_order')::integer, qi.sort_order, 0), qi.id)
      FROM public.quote_items qi
      WHERE qi.quote_id=q.id
    ), '[]'::jsonb)
  )
  FROM public.quotes q
  WHERE q.id=p_quote_id;
$$;
REVOKE ALL ON FUNCTION public.quote_approval_content_snapshot(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_approval_content_snapshot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_quote_approval(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_token_id uuid;
  v_payload jsonb;
BEGIN
  SELECT t.id, jsonb_build_object(
    'quote_number', q.quote_number,
    'client_name', q.client_name,
    'total', q.total,
    'valid_until', q.valid_until,
    'status', t.status,
    'response', t.response,
    'responded_at', t.responded_at,
    'expires_at', t.expires_at,
    'subtotal', to_jsonb(q)->'subtotal',
    'discount_amount', to_jsonb(q)->'discount_amount',
    'shipping_cost', to_jsonb(q)->'shipping_cost',
    'payment_terms', to_jsonb(q)->'payment_terms',
    'delivery_time', to_jsonb(q)->'delivery_time',
    'notes', to_jsonb(q)->'notes',
    'items', public.quote_approval_content_snapshot(q.id)->'items'
  ) INTO v_token_id, v_payload
  FROM public.quote_approval_tokens t
  JOIN public.quotes q ON q.id::text=t.quote_id AND q.seller_id=t.seller_id
  WHERE t.token=_token AND t.status IN ('active','responded')
    AND (t.expires_at IS NULL OR t.expires_at>statement_timestamp())
    AND q.deleted_at IS NULL AND q.is_latest_version
    AND (q.valid_until IS NULL OR q.valid_until::date>=CURRENT_DATE)
  ORDER BY t.created_at DESC, t.id
  LIMIT 1
  FOR UPDATE OF t;

  IF v_token_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.quote_approval_tokens
  SET viewed_at = COALESCE(viewed_at, clock_timestamp())
  WHERE id = v_token_id;

  RETURN v_payload;
END;
$$;

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

  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'active' OR NEW.response IS NOT NULL OR NEW.responded_at IS NOT NULL
         OR NEW.signer_name IS NOT NULL OR NEW.signer_document IS NOT NULL
         OR NEW.signed_at IS NOT NULL OR NEW.signature_data_url IS NOT NULL
         OR NEW.signature_hash IS NOT NULL OR NEW.signature_evidence IS NOT NULL
         OR NEW.signature_key_id IS NOT NULL OR NEW.signature_algorithm IS NOT NULL THEN
        RAISE EXCEPTION 'Uma resposta só pode ser registrada pelo fluxo público.' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.status NOT IN ('expired', 'revoked') OR OLD.status <> 'active'
         OR (NEW.response, NEW.response_notes, NEW.responded_at, NEW.signer_name,
             NEW.signer_document, NEW.signer_ip, NEW.signer_user_agent,
             NEW.signed_at, NEW.signature_hash, NEW.signature_data_url,
             NEW.signature_evidence, NEW.signature_key_id, NEW.signature_algorithm)
            IS DISTINCT FROM
            (OLD.response, OLD.response_notes, OLD.responded_at, OLD.signer_name,
             OLD.signer_document, OLD.signer_ip, OLD.signer_user_agent,
             OLD.signed_at, OLD.signature_hash, OLD.signature_data_url,
             OLD.signature_evidence, OLD.signature_key_id, OLD.signature_algorithm) THEN
        RAISE EXCEPTION 'O cliente só pode revogar um link ativo.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_local_quote_approval_token() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.apply_local_quote_approval_response(
  _token text, _response text, _response_notes text,
  _signer_name text, _signer_document text, _signature_data_url text,
  _signer_ip text, _signer_user_agent text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, extensions
AS $function$
DECLARE
  v_token public.quote_approval_tokens%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
  v_now timestamptz;
  v_evidence jsonb;
  v_key_id uuid;
  v_hmac_key text;
  v_quote_snapshot jsonb;
  v_quote_snapshot_sha256 text;
BEGIN
  IF _response IS NULL OR _response NOT IN ('approved', 'rejected')
     OR length(_response_notes) > 2000
     OR length(_signer_ip) > 64
     OR length(_signer_user_agent) > 512 THEN
    RAISE EXCEPTION 'Resposta inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT q.* INTO v_quote FROM public.quotes q
    JOIN public.quote_approval_tokens t ON q.id::text = t.quote_id
    WHERE t.token = _token FOR UPDATE OF q;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_token FROM public.quote_approval_tokens WHERE token = _token FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR v_token.status <> 'active' OR v_token.responded_at IS NOT NULL
     OR (v_token.expires_at IS NOT NULL AND v_token.expires_at <= v_now)
     OR v_quote.seller_id <> v_token.seller_id OR v_quote.deleted_at IS NOT NULL
     OR NOT v_quote.is_latest_version OR v_quote.status NOT IN ('draft', 'pending', 'sent', 'viewed', 'revision') THEN
    RETURN false;
  END IF;
  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until::date < CURRENT_DATE THEN
    RETURN false;
  END IF;

  IF _signature_data_url IS NOT NULL THEN
    SELECT k.id, v.decrypted_secret INTO v_key_id, v_hmac_key
    FROM public.quote_approval_evidence_keys k
    JOIN vault.decrypted_secrets v ON v.name=k.vault_secret_name
    WHERE k.is_active
    ORDER BY v.updated_at DESC LIMIT 1;
    IF v_hmac_key IS NULL OR length(v_hmac_key) < 32 THEN
      RAISE EXCEPTION 'Evidência de assinatura não configurada.' USING ERRCODE = '55000';
    END IF;
  END IF;

  UPDATE public.quotes SET status = _response, client_response = _response,
    client_response_at = v_now, client_response_notes = _response_notes
    WHERE id = v_quote.id;
  IF _signature_data_url IS NOT NULL THEN
    v_quote_snapshot := public.quote_approval_content_snapshot(v_quote.id);
    v_quote_snapshot_sha256 := encode(extensions.digest(convert_to(v_quote_snapshot::text, 'UTF8'), 'sha256'), 'hex');
    v_evidence := jsonb_build_object(
      'version', 1,
      'quote_id', v_quote.id,
      'quote_number', v_quote.quote_number,
      'quote_version', v_quote.version,
      'quote_snapshot', v_quote_snapshot,
      'quote_snapshot_sha256', v_quote_snapshot_sha256,
      'token_sha256', encode(extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex'),
      'response', _response,
      'signer_name', _signer_name,
      'signer_document_sha256', encode(extensions.digest(convert_to(_signer_document, 'UTF8'), 'sha256'), 'hex'),
      'signed_at', v_now,
      'signer_ip', COALESCE(NULLIF(btrim(_signer_ip), ''), 'unknown'),
      'signer_user_agent', COALESCE(NULLIF(btrim(_signer_user_agent), ''), 'unknown'),
      'signature_image_sha256', encode(extensions.digest(convert_to(_signature_data_url, 'UTF8'), 'sha256'), 'hex')
    );
  END IF;
  UPDATE public.quote_approval_tokens SET
    status = 'responded', response = _response, response_notes = _response_notes,
    responded_at = v_now, updated_at = v_now,
    signer_name = _signer_name, signer_document = _signer_document,
    signer_ip = CASE WHEN _signature_data_url IS NOT NULL THEN COALESCE(NULLIF(btrim(_signer_ip), ''), 'unknown') END,
    signer_user_agent = CASE WHEN _signature_data_url IS NOT NULL THEN COALESCE(NULLIF(btrim(_signer_user_agent), ''), 'unknown') END,
    signed_at = CASE WHEN _signature_data_url IS NOT NULL THEN v_now END,
    signature_data_url = _signature_data_url,
    signature_evidence = v_evidence,
    signature_key_id = v_key_id,
    signature_algorithm = CASE WHEN _signature_data_url IS NOT NULL THEN 'hmac-sha256-v1' END,
    signature_hash = CASE WHEN _signature_data_url IS NOT NULL
      THEN encode(extensions.hmac(convert_to(v_evidence::text, 'UTF8'), convert_to(v_hmac_key, 'UTF8'), 'sha256'), 'hex') END
    WHERE id = v_token.id;
  INSERT INTO public.quote_history(quote_id, user_id, action, description)
    VALUES (v_quote.id, v_quote.seller_id, 'public_response',
      CASE _response WHEN 'approved' THEN 'Orçamento aprovado pelo link público.'
      ELSE 'Orçamento recusado pelo link público.' END);
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.submit_quote_response(
  _token text, _response text, _response_notes text DEFAULT NULL
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.apply_local_quote_approval_response(
    _token, _response, _response_notes, NULL, NULL, NULL, NULL, NULL
  );
$$;
REVOKE ALL ON FUNCTION public.submit_quote_response(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_response(text,text,text) TO service_role;

DROP FUNCTION public.submit_signed_quote_response(text,text,text,text,text);
CREATE FUNCTION public.submit_signed_quote_response(
  _token text, _response text, _signer_name text, _signer_document text,
  _signature_data_url text, _signer_ip text, _signer_user_agent text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _signer_name IS NULL OR length(btrim(_signer_name)) NOT BETWEEN 2 AND 200
     OR _signer_document IS NULL OR _signer_document !~ '^([0-9]{11}|[0-9]{14})$'
     OR _signature_data_url IS NULL OR length(_signature_data_url) NOT BETWEEN 40 AND 262144
     OR _signature_data_url !~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$'
     OR length(_signer_ip) > 64 OR length(_signer_user_agent) > 512 THEN
    RAISE EXCEPTION 'Dados da assinatura inválidos.' USING ERRCODE = '22023';
  END IF;
  RETURN public.apply_local_quote_approval_response(
    _token, _response, NULL, btrim(_signer_name), _signer_document,
    _signature_data_url, _signer_ip, _signer_user_agent
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_signed_quote_response(text,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_signed_quote_response(text,text,text,text,text,text,text)
  TO service_role;

DROP FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text);

REVOKE EXECUTE ON FUNCTION public.get_public_quote_approval(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote_approval(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_token_by_value(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer,integer)
  TO service_role;

CREATE FUNCTION public.verify_quote_approval_signature(p_token_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, extensions
AS $$
  SELECT COALESCE(
    t.signature_hash = encode(extensions.hmac(
      convert_to(t.signature_evidence::text,'UTF8'),
      convert_to(v.decrypted_secret,'UTF8'),'sha256'
    ),'hex')
    AND t.signature_evidence->>'quote_snapshot_sha256' = encode(extensions.digest(
      convert_to(public.quote_approval_content_snapshot(t.quote_id::uuid)::text,'UTF8'),'sha256'
    ),'hex'), false)
  FROM public.quote_approval_tokens t
  JOIN public.quote_approval_evidence_keys k ON k.id=t.signature_key_id
  JOIN vault.decrypted_secrets v ON v.name=k.vault_secret_name
  WHERE t.id=p_token_id AND t.signature_algorithm='hmac-sha256-v1'
  ORDER BY v.updated_at DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_quote_approval_signature(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_quote_approval_signature(uuid) TO service_role;

CREATE FUNCTION public.rotate_quote_approval_evidence_key(p_vault_secret_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault
AS $$
DECLARE v_id uuid; v_secret text;
BEGIN
  IF p_vault_secret_name !~ '^quote_approval_evidence_hmac_v[0-9]+$' THEN
    RAISE EXCEPTION 'Nome de versão de chave inválido.' USING ERRCODE='22023';
  END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
    WHERE name=p_vault_secret_name ORDER BY updated_at DESC LIMIT 1;
  IF v_secret IS NULL OR length(v_secret)<32 THEN
    RAISE EXCEPTION 'A nova chave não existe no Vault ou é curta.' USING ERRCODE='55000';
  END IF;
  LOCK TABLE public.quote_approval_evidence_keys IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.quote_approval_evidence_keys WHERE vault_secret_name=p_vault_secret_name) THEN
    RAISE EXCEPTION 'Esta versão de chave já foi registrada.' USING ERRCODE='23505';
  END IF;
  UPDATE public.quote_approval_evidence_keys
    SET is_active=false,retired_at=clock_timestamp() WHERE is_active;
  INSERT INTO public.quote_approval_evidence_keys(vault_secret_name,is_active)
    VALUES(p_vault_secret_name,true) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rotate_quote_approval_evidence_key(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_quote_approval_evidence_key(text) TO service_role;
