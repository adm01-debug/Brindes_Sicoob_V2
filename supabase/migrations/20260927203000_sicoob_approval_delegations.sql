-- Delegações temporárias de aprovação. A autoridade nunca é copiada para o
-- substituto: ela é reavaliada no delegante e no escopo do pedido a cada ação.

CREATE TABLE public.sicoob_approval_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id uuid NOT NULL REFERENCES auth.users(id),
  delegate_id uuid NOT NULL REFERENCES auth.users(id),
  cooperative_id uuid NOT NULL REFERENCES public.cooperativas(id),
  pa_id uuid REFERENCES public.postos_atendimento(id),
  competencies text[] NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revocation_reason text,
  CONSTRAINT sicoob_approval_delegation_distinct_actors
    CHECK (delegator_id <> delegate_id),
  CONSTRAINT sicoob_approval_delegation_valid_period
    CHECK (ends_at > starts_at AND ends_at <= starts_at + interval '90 days'),
  CONSTRAINT sicoob_approval_delegation_competencies
    CHECK (
      cardinality(competencies) > 0
      AND competencies <@ ARRAY['approve_order', 'reject_order']::text[]
    ),
  CONSTRAINT sicoob_approval_delegation_reason
    CHECK (length(btrim(reason)) >= 10),
  CONSTRAINT sicoob_approval_delegation_revocation_complete
    CHECK (
      (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
      OR (
        revoked_at IS NOT NULL
        AND revoked_by IS NOT NULL
        AND length(btrim(revocation_reason)) >= 10
      )
    )
);

CREATE INDEX sicoob_approval_delegations_delegate_active_idx
  ON public.sicoob_approval_delegations(delegate_id, starts_at, ends_at)
  WHERE revoked_at IS NULL;
CREATE INDEX sicoob_approval_delegations_delegator_idx
  ON public.sicoob_approval_delegations(delegator_id, created_at DESC);
CREATE INDEX sicoob_approval_delegations_scope_idx
  ON public.sicoob_approval_delegations(cooperative_id, pa_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.sicoob_approval_requests
  ADD COLUMN approval_delegation_id uuid
    REFERENCES public.sicoob_approval_delegations(id),
  ADD COLUMN authority_delegator_id uuid
    REFERENCES auth.users(id);

ALTER TABLE public.sicoob_approval_delegations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sicoob_approval_delegations FROM anon, authenticated;
GRANT SELECT ON public.sicoob_approval_delegations TO authenticated;

CREATE POLICY sicoob_approval_delegations_read_participants
ON public.sicoob_approval_delegations FOR SELECT TO authenticated
USING (
  delegator_id = auth.uid()
  OR delegate_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles actor_role
    WHERE actor_role.user_id = auth.uid()
      AND actor_role.role::text IN ('admin', 'manager', 'dev', 'supervisor')
  )
);

CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_delegation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Delegações não podem ser excluídas.';
  END IF;
  IF current_setting('app.sicoob_delegation_operation', true) <> 'revoke' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Delegação só pode ser alterada pela revogação formal.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.delegator_id IS DISTINCT FROM OLD.delegator_id
     OR NEW.delegate_id IS DISTINCT FROM OLD.delegate_id
     OR NEW.cooperative_id IS DISTINCT FROM OLD.cooperative_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.competencies IS DISTINCT FROM OLD.competencies
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='O escopo de uma delegação é imutável.';
  END IF;
  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Delegação já revogada.';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.protect_sicoob_approval_delegation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tr_protect_sicoob_approval_delegation
BEFORE UPDATE OR DELETE ON public.sicoob_approval_delegations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_approval_delegation();

CREATE OR REPLACE FUNCTION public.create_sicoob_approval_delegation(
  p_delegate_id uuid,
  p_competencies text[],
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_profile public.profiles%ROWTYPE;
  v_delegate_profile public.profiles%ROWTYPE;
  v_cooperative_id uuid;
  v_pa_id uuid;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR p_delegate_id IS NULL OR p_delegate_id = v_actor THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Delegante e substituto devem ser usuários distintos.';
  END IF;
  IF p_starts_at < statement_timestamp() - interval '1 minute'
     OR p_ends_at <= p_starts_at
     OR p_ends_at > p_starts_at + interval '90 days' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='A vigência deve começar agora ou no futuro e durar no máximo 90 dias.';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) < 10
     OR cardinality(p_competencies) = 0
     OR NOT p_competencies <@ ARRAY['approve_order', 'reject_order']::text[] THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Informe motivo e competências delegáveis válidas.';
  END IF;

  SELECT * INTO v_actor_profile FROM public.profiles
  WHERE (user_id=v_actor OR id=v_actor) AND is_active IS TRUE AND deleted_at IS NULL;
  SELECT * INTO v_delegate_profile FROM public.profiles
  WHERE (user_id=p_delegate_id OR id=p_delegate_id) AND is_active IS TRUE AND deleted_at IS NULL;
  IF v_actor_profile.id IS NULL OR v_delegate_profile.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Delegante e substituto precisam de vínculo ativo.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=v_actor AND role::text IN ('gestor_compras', 'comprador_singular')
  ) THEN
    v_cooperative_id := v_actor_profile.cooperativa_id;
    v_pa_id := NULL;
    IF v_cooperative_id IS NULL OR v_delegate_profile.cooperativa_id IS DISTINCT FROM v_cooperative_id THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='O substituto deve pertencer à mesma cooperativa.';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role::text='gerente_pa'
  ) THEN
    v_cooperative_id := v_actor_profile.cooperativa_id;
    v_pa_id := v_actor_profile.pa_id;
    IF v_cooperative_id IS NULL OR v_pa_id IS NULL
       OR v_delegate_profile.cooperativa_id IS DISTINCT FROM v_cooperative_id
       OR v_delegate_profile.pa_id IS DISTINCT FROM v_pa_id THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='O substituto deve pertencer ao mesmo PA.';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='O papel atual não permite conceder delegações.';
  END IF;

  -- Serializa concessões do substituto e impede corrida de sobreposição/ciclo.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_delegate_id::text, 73421));
  IF EXISTS (
    SELECT 1 FROM public.sicoob_approval_delegations delegation
    WHERE delegation.revoked_at IS NULL
      AND delegation.delegate_id = p_delegate_id
      AND delegation.cooperative_id = v_cooperative_id
      AND delegation.pa_id IS NOT DISTINCT FROM v_pa_id
      AND delegation.competencies && p_competencies
      AND tstzrange(delegation.starts_at, delegation.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23P01', MESSAGE='Já existe delegação sobreposta para o substituto e competência.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sicoob_approval_delegations reciprocal
    WHERE reciprocal.revoked_at IS NULL
      AND reciprocal.delegator_id = p_delegate_id
      AND reciprocal.delegate_id = v_actor
      AND tstzrange(reciprocal.starts_at, reciprocal.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Delegação circular não é permitida.';
  END IF;

  INSERT INTO public.sicoob_approval_delegations (
    delegator_id, delegate_id, cooperative_id, pa_id,
    competencies, starts_at, ends_at, reason
  ) VALUES (
    v_actor, p_delegate_id, v_cooperative_id, v_pa_id,
    ARRAY(SELECT DISTINCT value FROM unnest(p_competencies) value ORDER BY value),
    p_starts_at, p_ends_at, btrim(p_reason)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_sicoob_approval_delegation(uuid, text[], timestamptz, timestamptz, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sicoob_approval_delegation(uuid, text[], timestamptz, timestamptz, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_sicoob_approval_delegation(
  p_delegation_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_delegation public.sicoob_approval_delegations%ROWTYPE;
  v_privileged boolean;
BEGIN
  IF v_actor IS NULL OR length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Informe uma justificativa de revogação com ao menos 10 caracteres.';
  END IF;
  SELECT * INTO v_delegation FROM public.sicoob_approval_delegations
  WHERE id=p_delegation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Delegação não encontrada.';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=v_actor AND role::text IN ('admin', 'manager', 'dev', 'supervisor')
  ) INTO v_privileged;
  IF v_delegation.delegator_id <> v_actor AND NOT v_privileged THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Somente o delegante ou a supervisão pode revogar.';
  END IF;
  IF v_delegation.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Delegação já revogada.';
  END IF;
  PERFORM set_config('app.sicoob_delegation_operation', 'revoke', true);
  UPDATE public.sicoob_approval_delegations
  SET revoked_at=clock_timestamp(), revoked_by=v_actor, revocation_reason=btrim(p_reason)
  WHERE id=v_delegation.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.revoke_sicoob_approval_delegation(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_sicoob_approval_delegation(uuid, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sicoob_actor_has_active_approval_delegation(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_approval_delegations delegation
    JOIN public.sicoob_orders order_row ON order_row.id=p_order_id
    JOIN public.profiles delegate_profile
      ON delegate_profile.user_id=p_actor_id OR delegate_profile.id=p_actor_id
    WHERE delegation.delegate_id=p_actor_id
      AND delegation.revoked_at IS NULL
      AND delegation.starts_at <= statement_timestamp()
      AND delegation.ends_at > statement_timestamp()
      AND delegation.competencies && ARRAY['approve_order', 'reject_order']::text[]
      AND delegation.cooperative_id=order_row.cooperative_id
      AND (delegation.pa_id IS NULL OR delegation.pa_id=order_row.pa_id)
      AND delegate_profile.is_active IS TRUE
      AND delegate_profile.deleted_at IS NULL
      AND delegate_profile.cooperativa_id=delegation.cooperative_id
      AND (delegation.pa_id IS NULL OR delegate_profile.pa_id=delegation.pa_id)
      AND public.sicoob_actor_can_approve(
        delegation.delegator_id,
        p_order_id,
        order_row.status='escalated_to_board'
      )
  );
$function$;
REVOKE ALL ON FUNCTION public.sicoob_actor_has_active_approval_delegation(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_has_active_approval_delegation(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_read_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.sicoob_actor_can_manage_fulfillment(auth.uid(), p_order_id)
    OR public.sicoob_actor_has_active_approval_delegation(auth.uid(), p_order_id)
  );
$function$;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_read_order(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_read_order(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_sicoob_approval_authority(
  p_actor_id uuid,
  p_order_id uuid,
  p_requester_id uuid,
  p_board_only boolean,
  p_competence text
)
RETURNS TABLE(delegation_id uuid, authority_delegator_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_order public.sicoob_orders%ROWTYPE;
  v_policy record;
BEGIN
  IF p_competence NOT IN ('approve_order', 'reject_order') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Competência de aprovação inválida.';
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Pedido não encontrado.';
  END IF;
  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(p_order_id);

  IF public.sicoob_actor_can_approve(p_actor_id, p_order_id, p_board_only) THEN
    PERFORM public.assert_sicoob_approval_actor(
      p_actor_id, p_order_id, p_requester_id, p_board_only
    );
    RETURN QUERY SELECT NULL::uuid, p_actor_id;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT delegation.id, delegation.delegator_id
  FROM public.sicoob_approval_delegations delegation
  JOIN public.profiles delegate_profile
    ON delegate_profile.user_id=p_actor_id OR delegate_profile.id=p_actor_id
  WHERE delegation.delegate_id=p_actor_id
    AND delegation.revoked_at IS NULL
    AND delegation.starts_at <= statement_timestamp()
    AND delegation.ends_at > statement_timestamp()
    AND p_competence=ANY(delegation.competencies)
    AND delegation.cooperative_id=v_order.cooperative_id
    AND (delegation.pa_id IS NULL OR delegation.pa_id=v_order.pa_id)
    AND delegate_profile.is_active IS TRUE
    AND delegate_profile.deleted_at IS NULL
    AND delegate_profile.cooperativa_id=delegation.cooperative_id
    AND (delegation.pa_id IS NULL OR delegate_profile.pa_id=delegation.pa_id)
    AND public.sicoob_actor_can_approve(
      delegation.delegator_id, p_order_id, p_board_only
    )
    AND (
      NOT v_policy.forbid_self_approval
      OR (
        v_order.created_by NOT IN (p_actor_id, delegation.delegator_id)
        AND p_requester_id NOT IN (p_actor_id, delegation.delegator_id)
      )
    )
  ORDER BY delegation.ends_at, delegation.id
  LIMIT 1
  FOR SHARE OF delegation;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Ator sem autoridade própria ou delegação vigente para esta decisão.';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.resolve_sicoob_approval_authority(uuid, uuid, uuid, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sicoob_approval_authority(uuid, uuid, uuid, boolean, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.approve_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
  v_authority record;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Identidade do aprovador inválida.';
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id FOR UPDATE;
  SELECT * INTO v_request FROM public.sicoob_approval_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Solicitação já decidida.';
  END IF;
  IF v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Pedido não está aguardando aprovação.';
  END IF;
  IF v_order.total_amount IS DISTINCT FROM v_request.amount_at_request THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='O valor do pedido diverge da solicitação submetida; reenvie para aprovação.';
  END IF;
  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor_id, v_order.id, v_request.requester_id,
    v_order.status='escalated_to_board', 'approve_order'
  );
  PERFORM set_config('app.sicoob_approval_operation', 'approve', true);
  UPDATE public.sicoob_approval_requests SET
    status='approved', approver_id=v_actor_id,
    approval_delegation_id=v_authority.delegation_id,
    authority_delegator_id=CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END,
    updated_at=clock_timestamp()
  WHERE id=v_request.id;
  UPDATE public.sicoob_orders SET
    status='confirmed', approved_by=v_actor_id, approved_at=clock_timestamp(), updated_at=clock_timestamp()
  WHERE id=v_order.id;
  INSERT INTO public.sicoob_manager_audit(manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'approve', jsonb_build_object(
    'request_id', v_request.id,
    'policy_version', v_order.approval_policy_version,
    'authority_source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_sicoob_order(
  p_request_id uuid,
  p_order_id uuid,
  p_manager_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.sicoob_approval_requests%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
  v_authority record;
BEGIN
  IF v_actor_id IS NULL OR p_manager_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Identidade do aprovador inválida.';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Informe um motivo de rejeição com ao menos 10 caracteres.';
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id FOR UPDATE;
  SELECT * INTO v_request FROM public.sicoob_approval_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_order.id IS NULL OR v_request.order_id <> v_order.id THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Solicitação ou pedido não encontrado.';
  END IF;
  IF v_request.status <> 'pending' OR v_order.status NOT IN ('waiting_approval', 'escalated_to_board') THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Solicitação ou pedido não está disponível para rejeição.';
  END IF;
  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor_id, v_order.id, v_request.requester_id,
    v_order.status='escalated_to_board', 'reject_order'
  );
  PERFORM set_config('app.sicoob_approval_operation', 'reject', true);
  PERFORM set_config('app.sicoob_order_status_comment', btrim(p_reason), true);
  UPDATE public.sicoob_approval_requests SET
    status='rejected', approver_id=v_actor_id, rejection_reason=btrim(p_reason),
    approval_delegation_id=v_authority.delegation_id,
    authority_delegator_id=CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END,
    updated_at=clock_timestamp()
  WHERE id=v_request.id;
  UPDATE public.sicoob_orders SET status='rejected', updated_at=clock_timestamp()
  WHERE id=v_order.id;
  INSERT INTO public.sicoob_manager_audit(manager_id, order_id, action, details)
  VALUES (v_actor_id, v_order.id, 'reject', jsonb_build_object(
    'request_id', v_request.id,
    'reason', btrim(p_reason),
    'policy_version', v_order.approval_policy_version,
    'authority_source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE WHEN v_authority.delegation_id IS NULL THEN NULL ELSE v_authority.authority_delegator_id END
  ));
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_sicoob_order(uuid, uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_sicoob_order(uuid, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_sicoob_order(uuid, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_sicoob_order(uuid, uuid, uuid, text)
  TO authenticated, service_role;
