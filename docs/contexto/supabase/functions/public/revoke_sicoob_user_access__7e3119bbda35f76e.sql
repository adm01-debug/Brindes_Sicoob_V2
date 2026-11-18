CREATE OR REPLACE FUNCTION public.revoke_sicoob_user_access(p_user_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_target_profile public.profiles%ROWTYPE;
  v_actor_is_platform_admin boolean;
BEGIN
  IF v_actor_id IS NULL OR p_user_id IS NULL OR p_user_id = v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Ator e usuário alvo distintos são obrigatórios.';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com pelo menos oito caracteres.';
  END IF;
  SELECT * INTO v_target_profile
    FROM public.profiles p
   WHERE p.user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND OR v_target_profile.is_active IS DISTINCT FROM true OR v_target_profile.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_actor_id
       AND ur.role IN ('admin'::public.app_role, 'dev'::public.app_role)
  ) AND public.sicoob_actor_is_active(v_actor_id)
  INTO v_actor_is_platform_admin;

  IF NOT v_actor_is_platform_admin AND NOT (
    EXISTS (
      SELECT 1
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = v_actor_id
       WHERE p.user_id = v_actor_id
         AND p.cooperativa_id = v_target_profile.cooperativa_id
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
         AND ur.role IN ('gestor_compras'::public.app_role, 'comprador_singular'::public.app_role)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = p_user_id
         AND ur.role NOT IN (
           'vendedor'::public.app_role,
           'gerente_pa'::public.app_role,
           'comprador_pac'::public.app_role
         )
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revogar este vínculo.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = p_user_id AND ur.role = 'dev'::public.app_role
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_actor_id AND ur.role = 'dev'::public.app_role
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Somente outro desenvolvedor pode revogar acesso técnico.';
  END IF;

  UPDATE public.profiles
     SET is_active = false, deleted_at = now(), updated_at = now()
   WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  UPDATE public.sicoob_invitations
     SET access_revoked_by = v_actor_id,
         access_revoked_at = now(),
         updated_at = now()
   WHERE accepted_by = p_user_id
     AND cooperative_id = v_target_profile.cooperativa_id
     AND access_revoked_at IS NULL;
  INSERT INTO public.sicoob_invitation_events (
    cooperative_id, action, actor_id, target_user_id, details
  ) VALUES (
    v_target_profile.cooperativa_id, 'access_revoked', v_actor_id, p_user_id,
    jsonb_build_object('reason', trim(p_reason), 'pa_id', v_target_profile.pa_id)
  );
END;
$function$
