CREATE OR REPLACE FUNCTION public.verify_step_up_otp(_challenge_id uuid, _otp text)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
  _otp_h TEXT;
  _token TEXT;
  _token_h TEXT;
  _tid UUID;
  _exp TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT challenge.* INTO _row FROM public.step_up_challenges AS challenge
  WHERE challenge.id = _challenge_id AND challenge.user_id = _uid
    AND challenge.consumed = false AND challenge.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, event_type, challenge_id, metadata)
    VALUES (_uid, 'failed', _challenge_id, '{"reason":"challenge_not_found_or_expired"}'::jsonb);
    RAISE EXCEPTION 'invalid_or_expired_challenge';
  END IF;

  IF NOT _row.password_verified THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"password_not_verified"}'::jsonb);
    RAISE EXCEPTION 'password_not_verified_first';
  END IF;

  IF _row.attempts >= _row.max_attempts THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"max_attempts"}'::jsonb);
    RAISE EXCEPTION 'max_attempts_exceeded';
  END IF;

  _otp_h := encode(extensions.digest(_otp || _uid::text, 'sha256'), 'hex');

  IF _otp_h <> _row.otp_hash THEN
    UPDATE public.step_up_challenges SET attempts = attempts + 1 WHERE id = _challenge_id;
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, jsonb_build_object('reason','wrong_otp','attempt', _row.attempts + 1));
    RAISE EXCEPTION 'invalid_otp';
  END IF;

  -- OK: gera token de uso único
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  _token_h := encode(extensions.digest(_token, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_tokens(user_id, action, target_ref, token_hash, challenge_id, expires_at)
  VALUES (_uid, _row.action, _row.target_ref, _token_h, _challenge_id, _exp)
  RETURNING id INTO _tid;

  UPDATE public.step_up_challenges
    SET otp_verified = true, consumed = true
    WHERE id = _challenge_id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'otp_verified', _challenge_id, _tid);
  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'token_issued', _challenge_id, _tid);

  RETURN QUERY SELECT _token, _exp;
END;
$function$
