CREATE OR REPLACE FUNCTION public.issue_sicoob_invitation(p_email text, p_cooperative_id uuid, p_pa_id uuid, p_role app_role, p_expires_in_hours integer, p_idempotency_key uuid)
 RETURNS TABLE(invitation_id uuid, invitation_token text, invitation_expires_at timestamp with time zone, reused boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_token text;
  v_invitation public.sicoob_invitations%ROWTYPE;
  v_superseded_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Ator e chave de idempotência são obrigatórios.';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um email institucional válido.';
  END IF;
  IF p_expires_in_hours IS NULL OR p_expires_in_hours < 1 OR p_expires_in_hours > 168 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A validade deve ficar entre 1 e 168 horas.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cooperativas c
     WHERE c.id = p_cooperative_id AND c.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'A cooperativa informada não está ativa.';
  END IF;
  IF p_role IN ('gerente_pa'::public.app_role, 'comprador_pac'::public.app_role) AND p_pa_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O papel informado exige um PA.';
  END IF;
  IF p_role IN (
    'gestor_compras'::public.app_role,
    'comprador_singular'::public.app_role,
    'supervisor'::public.app_role,
    'manager'::public.app_role
  ) AND p_pa_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O papel informado pertence à Singular e não aceita PA.';
  END IF;
  IF p_pa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.postos_atendimento pa
     WHERE pa.id = p_pa_id
       AND pa.cooperativa_id = p_cooperative_id
       AND pa.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'O PA não pertence à cooperativa ou está inativo.';
  END IF;
  IF NOT public.sicoob_inviter_can_issue(v_actor_id, p_cooperative_id, p_role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode conceder este papel neste escopo.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'sicoob-invitation-idempotency:' || v_actor_id::text || ':' || p_idempotency_key::text, 0
  ));
  SELECT * INTO v_invitation
    FROM public.sicoob_invitations i
   WHERE i.invited_by = v_actor_id
     AND i.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_invitation.email IS DISTINCT FROM v_email
       OR v_invitation.cooperative_id IS DISTINCT FROM p_cooperative_id
       OR v_invitation.pa_id IS DISTINCT FROM p_pa_id
       OR v_invitation.role IS DISTINCT FROM p_role THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com outro conteúdo.';
    END IF;
    RETURN QUERY SELECT v_invitation.id, NULL::text, v_invitation.expires_at, true;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'sicoob-invitation-scope:' || v_email || ':' || p_cooperative_id::text || ':'
      || COALESCE(p_pa_id::text, '-') || ':' || p_role::text, 0
  ));

  IF EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.user_id = u.id
     WHERE lower(u.email) = v_email
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
       AND (
         (p.cooperativa_id IS NOT NULL AND p.cooperativa_id IS DISTINCT FROM p_cooperative_id)
         OR (p.pa_id IS NOT NULL AND p.pa_id IS DISTINCT FROM p_pa_id)
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O usuário já possui vínculo ativo em outro escopo.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.user_id = u.id
      JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = p_role
     WHERE lower(u.email) = v_email
       AND p.cooperativa_id = p_cooperative_id
       AND p.pa_id IS NOT DISTINCT FROM p_pa_id
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'O usuário já possui este vínculo e papel.';
  END IF;

  FOR v_superseded_id IN
    UPDATE public.sicoob_invitations i
       SET status = 'superseded', updated_at = now()
     WHERE i.email = v_email
       AND i.cooperative_id = p_cooperative_id
       AND i.pa_id IS NOT DISTINCT FROM p_pa_id
       AND i.role = p_role
       AND i.status = 'pending'
    RETURNING i.id
  LOOP
    INSERT INTO public.sicoob_invitation_events (
      invitation_id, cooperative_id, action, actor_id, details
    ) VALUES (
      v_superseded_id, p_cooperative_id, 'superseded', v_actor_id,
      jsonb_build_object('reason', 'reissued')
    );
  END LOOP;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.sicoob_invitations (
    token_hash, email, cooperative_id, pa_id, role, expires_at, invited_by, idempotency_key
  ) VALUES (
    extensions.digest(v_token, 'sha256'), v_email, p_cooperative_id, p_pa_id, p_role,
    now() + make_interval(hours => p_expires_in_hours), v_actor_id, p_idempotency_key
  ) RETURNING * INTO v_invitation;

  UPDATE public.sicoob_invitations
     SET superseded_by = v_invitation.id
   WHERE id = v_superseded_id;

  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id,
    details
  ) VALUES (
    v_invitation.id, p_cooperative_id, 'issued', v_actor_id,
    jsonb_build_object('role', p_role::text, 'pa_id', p_pa_id, 'expires_at', v_invitation.expires_at)
  );

  RETURN QUERY SELECT v_invitation.id, v_token, v_invitation.expires_at, false;
END;
$function$
