CREATE OR REPLACE FUNCTION public.request_step_up_challenge(_action step_up_action, _target_ref text DEFAULT NULL::text, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text)
 RETURNS TABLE(challenge_id uuid, otp_plain text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _otp TEXT;
  _otp_h TEXT;
  _cid UUID;
  _exp TIMESTAMPTZ;
  _recent_count INT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no session';
  END IF;

  -- Apenas dev pode solicitar step-up para essas ações
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'unauthorized', _ip, _user_agent);
    RAISE EXCEPTION 'forbidden: dev role required';
  END IF;

  -- Rate limit: máx 5 challenges por usuário por hora
  SELECT count(*) INTO _recent_count
  FROM public.step_up_challenges
  WHERE user_id = _uid AND created_at > (now() - interval '1 hour');

  IF _recent_count >= 5 THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'rate_limited', _ip, _user_agent);
    RAISE EXCEPTION 'rate_limited: too many step-up requests';
  END IF;

  -- Gera OTP de 6 dígitos
  _otp := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _otp_h := encode(extensions.digest(_otp || _uid::text, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_challenges(user_id, action, target_ref, otp_hash, expires_at, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, _otp_h, _exp, _ip, _user_agent)
  RETURNING id INTO _cid;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, 'challenge_requested', _cid, _ip, _user_agent);

  RETURN QUERY SELECT _cid, _otp, _exp;
END;
$function$
