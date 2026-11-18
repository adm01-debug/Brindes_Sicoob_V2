CREATE OR REPLACE FUNCTION public.get_quote_token_by_value(_token text)
 RETURNS SETOF quote_approval_tokens
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_safe public.quote_approval_tokens%ROWTYPE;
BEGIN
  SELECT t.id, t.quote_id, t.status, t.expires_at, t.responded_at, t.response
    INTO v_safe.id, v_safe.quote_id, v_safe.status, v_safe.expires_at, v_safe.responded_at, v_safe.response
    FROM public.quote_approval_tokens t
    WHERE t.token = _token AND public.get_public_quote_approval(_token) IS NOT NULL;
  IF FOUND THEN RETURN NEXT v_safe; END IF;
END;
$function$
