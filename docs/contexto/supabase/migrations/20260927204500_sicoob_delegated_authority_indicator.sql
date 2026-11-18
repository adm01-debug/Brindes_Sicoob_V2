-- Fecha a jornada de uso da delegação: candidatos elegíveis no mesmo escopo e
-- indicação inequívoca da origem da autoridade antes de cada decisão.

CREATE OR REPLACE FUNCTION public.validate_sicoob_approval_delegate_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=NEW.delegate_id AND role::text='comprador_pac'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE='42501',
      MESSAGE='O substituto precisa possuir o papel operacional comprador_pac.';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.validate_sicoob_approval_delegate_role()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tr_validate_sicoob_approval_delegate_role
BEFORE INSERT ON public.sicoob_approval_delegations
FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_approval_delegate_role();

CREATE OR REPLACE FUNCTION public.list_sicoob_approval_delegate_candidates()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  cooperativa_id uuid,
  pa_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_cooperative_scope boolean;
  v_pa_scope boolean;
BEGIN
  SELECT * INTO v_profile FROM public.profiles
  WHERE (profiles.user_id=v_actor OR profiles.id=v_actor)
    AND profiles.is_active IS TRUE AND profiles.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Vínculo ativo obrigatório.';
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id=v_actor
        AND role::text IN ('gestor_compras', 'comprador_singular')
    ),
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id=v_actor AND role::text='gerente_pa'
    )
  INTO v_cooperative_scope, v_pa_scope;
  IF NOT v_cooperative_scope AND NOT v_pa_scope THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Ator sem autoridade para conceder delegações.';
  END IF;

  RETURN QUERY
  SELECT candidate.user_id, candidate.full_name, candidate.email,
         candidate.cooperativa_id, candidate.pa_id
  FROM public.profiles candidate
  WHERE candidate.user_id<>v_actor
    AND candidate.is_active IS TRUE
    AND candidate.deleted_at IS NULL
    AND candidate.cooperativa_id=v_profile.cooperativa_id
    AND (v_cooperative_scope OR candidate.pa_id=v_profile.pa_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles candidate_role
      WHERE candidate_role.user_id=candidate.user_id
        AND candidate_role.role::text='comprador_pac'
    )
  ORDER BY candidate.full_name NULLS LAST, candidate.email NULLS LAST, candidate.user_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_sicoob_approval_delegate_candidates()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_sicoob_approval_delegate_candidates()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_approval_authority(
  p_order_id uuid,
  p_competence text DEFAULT 'approve_order'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_requester uuid;
  v_authority record;
  v_ends_at timestamptz;
BEGIN
  IF v_actor IS NULL OR p_competence NOT IN ('approve_order', 'reject_order') THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT requester_id INTO v_requester
  FROM public.sicoob_approval_requests
  WHERE order_id=p_order_id AND status='pending'
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;

  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor, p_order_id, v_requester,
    v_order.status='escalated_to_board', p_competence
  );
  IF v_authority.delegation_id IS NOT NULL THEN
    SELECT ends_at INTO v_ends_at FROM public.sicoob_approval_delegations
    WHERE id=v_authority.delegation_id;
  END IF;
  RETURN jsonb_build_object(
    'can_decide', true,
    'source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE
      WHEN v_authority.delegation_id IS NULL THEN NULL
      ELSE v_authority.authority_delegator_id
    END,
    'ends_at', v_ends_at
  );
EXCEPTION WHEN insufficient_privilege OR no_data_found THEN
  RETURN jsonb_build_object('can_decide', false, 'source', 'none');
END;
$function$;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_approval_authority(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_approval_authority(uuid, text)
  TO authenticated, service_role;
