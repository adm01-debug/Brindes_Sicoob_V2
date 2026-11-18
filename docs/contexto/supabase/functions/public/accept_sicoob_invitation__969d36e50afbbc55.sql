CREATE OR REPLACE FUNCTION public.accept_sicoob_invitation(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.sicoob_invitations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Convite ou sessão inválidos.';
  END IF;
  SELECT lower(email), email_confirmed_at
    INTO v_actor_email, v_email_confirmed_at
    FROM auth.users
   WHERE id = v_actor_id;
  IF v_actor_email IS NULL OR v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Confirme o email da conta antes de aceitar o convite.';
  END IF;

  SELECT * INTO v_invitation
    FROM public.sicoob_invitations i
   WHERE i.token_hash = extensions.digest(p_token, 'sha256')
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convite não encontrado.';
  END IF;
  IF v_invitation.status = 'accepted' AND v_invitation.accepted_by = v_actor_id THEN
    RETURN v_invitation.id;
  END IF;
  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O convite foi revogado, substituído ou já utilizado.';
  END IF;
  IF v_invitation.expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O convite expirou.';
  END IF;
  IF v_actor_email IS DISTINCT FROM v_invitation.email THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Entre com a conta correspondente ao email convidado.';
  END IF;
  IF NOT public.sicoob_inviter_can_issue(
    v_invitation.invited_by, v_invitation.cooperative_id, v_invitation.role
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A autoridade do emissor não está mais vigente.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cooperativas c
     WHERE c.id = v_invitation.cooperative_id AND c.is_active IS TRUE
  ) OR (
    v_invitation.pa_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.postos_atendimento pa
       WHERE pa.id = v_invitation.pa_id
         AND pa.cooperativa_id = v_invitation.cooperative_id
         AND pa.is_active IS TRUE
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A cooperativa ou o PA do convite não está mais ativo.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles p
   WHERE p.user_id = v_actor_id
   FOR UPDATE;
  IF FOUND AND (
    (v_profile.cooperativa_id IS NOT NULL AND v_profile.cooperativa_id IS DISTINCT FROM v_invitation.cooperative_id)
    OR (v_profile.pa_id IS NOT NULL AND v_profile.pa_id IS DISTINCT FROM v_invitation.pa_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A conta já possui vínculo ativo em outro escopo.';
  END IF;

  -- O cadastro fechado cria um papel vendedor provisório. Se ele for o único
  -- papel e a conta ainda não possuir escopo institucional, o aceite o troca
  -- pelo papel aprovado, evitando acumular privilégios por efeito do bootstrap.
  IF FOUND
     AND v_profile.cooperativa_id IS NULL
     AND v_profile.pa_id IS NULL
     AND (SELECT count(*) FROM public.user_roles ur WHERE ur.user_id = v_actor_id) = 1
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id AND ur.role = 'vendedor'::public.app_role
     ) THEN
    DELETE FROM public.user_roles
     WHERE user_id = v_actor_id AND role = 'vendedor'::public.app_role;
  END IF;

  INSERT INTO public.profiles (
    id, user_id, email, is_active, cooperativa_id, singular_id, pa_id, deleted_at
  ) VALUES (
    v_actor_id, v_actor_id, v_actor_email, true,
    v_invitation.cooperative_id, v_invitation.cooperative_id, v_invitation.pa_id, NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET is_active = true,
        deleted_at = NULL,
        cooperativa_id = EXCLUDED.cooperativa_id,
        singular_id = EXCLUDED.singular_id,
        pa_id = EXCLUDED.pa_id,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_actor_id, v_invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.sicoob_invitations
     SET status = 'accepted', accepted_by = v_actor_id, accepted_at = now(), updated_at = now()
   WHERE id = v_invitation.id;
  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id, target_user_id,
    details
  ) VALUES (
    v_invitation.id, v_invitation.cooperative_id, 'accepted', v_actor_id, v_actor_id,
    jsonb_build_object('role', v_invitation.role::text, 'pa_id', v_invitation.pa_id)
  );
  RETURN v_invitation.id;
END;
$function$
