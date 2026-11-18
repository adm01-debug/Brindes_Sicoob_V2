CREATE OR REPLACE FUNCTION public.record_mcp_access_violation(_user_id uuid, _reason text, _source text, _operation text DEFAULT NULL::text, _target_key_id uuid DEFAULT NULL::uuid, _ip text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _request_id text DEFAULT NULL::text, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.mcp_access_violations (
    user_id, reason, source, operation, target_key_id,
    ip_address, user_agent, request_id, details
  ) VALUES (
    _user_id, _reason, _source, _operation, _target_key_id,
    _ip, _user_agent, _request_id, COALESCE(_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  PERFORM public.check_mcp_abuse_threshold(_user_id, _ip);

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Nunca derruba a operação chamadora
  RAISE WARNING 'record_mcp_access_violation failed: %', SQLERRM;
  RETURN NULL;
END;
$function$
