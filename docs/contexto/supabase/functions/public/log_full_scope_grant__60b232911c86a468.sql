CREATE OR REPLACE FUNCTION public.log_full_scope_grant(_operation text, _key_id uuid, _key_prefix text, _challenge_id uuid DEFAULT NULL::uuid, _token_id uuid DEFAULT NULL::uuid, _justification text DEFAULT NULL::text, _confirmation_phrase_ok boolean DEFAULT NULL::boolean, _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text, _request_id text DEFAULT NULL::text, _extra jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _action public.step_up_action;
  _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Mapeia operação → step_up_action
  _action := CASE _operation
    WHEN 'escalate' THEN 'mcp_full_escalate'::public.step_up_action
    ELSE 'mcp_full_issue'::public.step_up_action
  END;

  INSERT INTO public.step_up_audit_log (
    user_id, action, target_ref, event_type,
    challenge_id, token_id, ip_address, user_agent, metadata
  ) VALUES (
    _uid, _action, _key_id::text, 'full_scope_granted',
    _challenge_id, _token_id, _ip, _user_agent,
    jsonb_build_object(
      'operation',          _operation,
      'key_id',             _key_id,
      'key_prefix',         _key_prefix,
      'expires_at',         _expires_at,
      'justification',      _justification,
      'verifications', jsonb_build_object(
        'is_dev_recheck',         true,    -- garantido pela edge antes de chamar
        'step_up_token_consumed', _token_id IS NOT NULL,
        'can_grant_mcp_full',     true,    -- garantido pela edge antes de chamar
        'confirmation_phrase_ok', COALESCE(_confirmation_phrase_ok, true),
        'has_justification',      _justification IS NOT NULL AND length(_justification) > 0
      ),
      'request_id',         _request_id,
      'granted_at',         now(),
      'extra',              _extra
    )
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$
