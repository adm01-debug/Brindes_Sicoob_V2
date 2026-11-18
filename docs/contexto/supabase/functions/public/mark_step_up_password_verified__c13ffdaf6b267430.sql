CREATE OR REPLACE FUNCTION public.mark_step_up_password_verified(_challenge_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
BEGIN
  SELECT * INTO _row FROM public.step_up_challenges
  WHERE id = _challenge_id AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.step_up_challenges SET password_verified = true WHERE id = _challenge_id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id)
  VALUES (_uid, _row.action, _row.target_ref, 'password_verified', _challenge_id);

  RETURN true;
END;
$function$
