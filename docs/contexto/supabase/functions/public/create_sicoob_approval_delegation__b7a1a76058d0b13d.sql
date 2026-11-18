CREATE OR REPLACE FUNCTION public.create_sicoob_approval_delegation(p_delegate_id uuid, p_competencies text[], p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
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
$function$
