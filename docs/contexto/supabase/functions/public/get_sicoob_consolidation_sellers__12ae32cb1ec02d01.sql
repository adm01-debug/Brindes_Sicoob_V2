CREATE OR REPLACE FUNCTION public.get_sicoob_consolidation_sellers()
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_cooperative_id uuid;
BEGIN
  SELECT cooperativa_id INTO v_cooperative_id
  FROM public.profiles AS actor_profile
  WHERE (actor_profile.user_id = v_actor_id OR actor_profile.id = v_actor_id)
    AND is_active IS TRUE
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_actor_id IS NULL OR v_cooperative_id IS NULL
     OR NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ur.user_id, COALESCE(NULLIF(trim(p.full_name), ''), ur.user_id::text)
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
  WHERE ur.role::text = 'vendedor'
    AND p.cooperativa_id = v_cooperative_id
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL
  ORDER BY 2;
END;
$function$
