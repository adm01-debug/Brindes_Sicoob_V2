CREATE OR REPLACE FUNCTION public.submit_quote_response(_token text, _response text, _response_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.apply_local_quote_approval_response(
    _token, _response, _response_notes, NULL, NULL, NULL, NULL, NULL
  );
$function$
