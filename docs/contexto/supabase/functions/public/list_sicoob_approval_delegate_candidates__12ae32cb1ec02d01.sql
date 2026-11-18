CREATE OR REPLACE FUNCTION public.list_sicoob_approval_delegate_candidates()
 RETURNS TABLE(user_id uuid, full_name text, email text, cooperativa_id uuid, pa_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
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
$function$
