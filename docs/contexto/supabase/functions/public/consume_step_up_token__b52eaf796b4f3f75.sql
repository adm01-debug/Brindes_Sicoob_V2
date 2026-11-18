CREATE OR REPLACE FUNCTION public.consume_step_up_token(_token text, _expected_action step_up_action, _expected_target text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _token_h TEXT;
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF _token IS NULL OR length(_token) < 32 THEN RETURN false; END IF;

  -- Re-checagem crítica: usuário ainda precisa ser dev no momento do consumo
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'unauthorized', '{"reason":"role_lost_at_consume"}'::jsonb);
    RETURN false;
  END IF;

  _token_h := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO _row FROM public.step_up_tokens
  WHERE token_hash = _token_h AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', '{"reason":"token_invalid_or_expired"}'::jsonb);
    RETURN false;
  END IF;

  IF _row.action <> _expected_action THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, jsonb_build_object('reason','action_mismatch','expected',_expected_action,'got',_row.action));
    RETURN false;
  END IF;

  IF _expected_target IS NOT NULL AND _row.target_ref IS DISTINCT FROM _expected_target THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, '{"reason":"target_mismatch"}'::jsonb);
    RETURN false;
  END IF;

  UPDATE public.step_up_tokens SET consumed = true, consumed_at = now() WHERE id = _row.id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id)
  VALUES (_uid, _expected_action, _expected_target, 'token_consumed', _row.id);

  RETURN true;
END;
$function$
