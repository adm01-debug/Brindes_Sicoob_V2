CREATE OR REPLACE FUNCTION public.revoke_sicoob_approval_delegation(p_delegation_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
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
$function$
