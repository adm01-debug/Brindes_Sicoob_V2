CREATE OR REPLACE FUNCTION public.finish_sicoob_approval_delivery(p_id uuid, p_lease_token uuid, p_outcome text, p_error_code text DEFAULT NULL::text, p_provider_id text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('delivered','retry','uncertain','failed')
    OR (p_error_code IS NOT NULL AND p_error_code !~ '^[a-z0-9_]{1,80}$')
    OR length(p_provider_id)>200
    OR (p_outcome='delivered' AND (p_provider_id IS NULL OR btrim(p_provider_id)=''))
    OR (p_outcome IN ('retry','uncertain','failed') AND (p_error_code IS NULL OR btrim(p_error_code)='')) THEN
    RAISE EXCEPTION 'Resultado de entrega inválido.' USING ERRCODE='22023';
  END IF;
  UPDATE public.sicoob_approval_deliveries SET
    state=CASE WHEN p_outcome='retry' AND attempts>=5 THEN 'failed' ELSE p_outcome END,
    available_at=clock_timestamp()+make_interval(secs => LEAST(900,30*power(2,attempts-1))::integer),
    last_error_code=p_error_code, provider_id=p_provider_id, updated_at=clock_timestamp(),
    delivered_at=CASE WHEN p_outcome='delivered' THEN clock_timestamp() END,
    lease_expires_at=NULL, lease_token=NULL
  WHERE id=p_id AND state='sending' AND lease_token=p_lease_token AND lease_expires_at>clock_timestamp();
  RETURN FOUND;
END;
$function$
