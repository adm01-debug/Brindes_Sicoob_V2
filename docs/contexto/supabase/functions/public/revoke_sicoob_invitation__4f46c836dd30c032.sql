CREATE OR REPLACE FUNCTION public.revoke_sicoob_invitation(p_invitation_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_invitation public.sicoob_invitations%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com pelo menos oito caracteres.';
  END IF;
  SELECT * INTO v_invitation
    FROM public.sicoob_invitations
   WHERE id = p_invitation_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convite não encontrado.'; END IF;
  IF v_invitation.status = 'revoked' AND v_invitation.revoked_by = v_actor_id THEN RETURN; END IF;
  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente convites pendentes podem ser revogados.';
  END IF;
  IF v_invitation.invited_by <> v_actor_id
     AND NOT public.sicoob_inviter_can_issue(v_actor_id, v_invitation.cooperative_id, v_invitation.role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revogar este convite.';
  END IF;
  UPDATE public.sicoob_invitations
     SET status = 'revoked', revoked_by = v_actor_id, revoked_at = now(), updated_at = now()
   WHERE id = v_invitation.id;
  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id, details
  ) VALUES (
    v_invitation.id, v_invitation.cooperative_id, 'revoked', v_actor_id,
    jsonb_build_object('reason', trim(p_reason))
  );
END;
$function$
