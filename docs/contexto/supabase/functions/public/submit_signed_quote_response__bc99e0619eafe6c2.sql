CREATE OR REPLACE FUNCTION public.submit_signed_quote_response(_token text, _response text, _signer_name text, _signer_document text, _signature_data_url text, _signer_ip text, _signer_user_agent text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
