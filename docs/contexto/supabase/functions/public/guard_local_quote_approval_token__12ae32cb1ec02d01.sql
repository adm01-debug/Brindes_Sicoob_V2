CREATE OR REPLACE FUNCTION public.guard_local_quote_approval_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
