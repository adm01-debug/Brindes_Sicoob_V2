CREATE OR REPLACE FUNCTION public.apply_local_quote_approval_response(_token text, _response text, _response_notes text, _signer_name text, _signer_document text, _signature_data_url text, _signer_ip text, _signer_user_agent text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'extensions'
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
$function$
