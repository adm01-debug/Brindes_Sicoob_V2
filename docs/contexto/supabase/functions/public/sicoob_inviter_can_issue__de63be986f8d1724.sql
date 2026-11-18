CREATE OR REPLACE FUNCTION public.sicoob_inviter_can_issue(p_actor_id uuid, p_cooperative_id uuid, p_role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  )
  AND p_role NOT IN ('admin'::public.app_role, 'dev'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = p_actor_id
         AND ur.role IN ('admin'::public.app_role, 'dev'::public.app_role)
    )
    OR (
      p_role IN (
        'vendedor'::public.app_role,
        'gerente_pa'::public.app_role,
        'comprador_pac'::public.app_role
      )
      AND EXISTS (
        SELECT 1
          FROM public.profiles p
          JOIN public.user_roles ur ON ur.user_id = p_actor_id
         WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
           AND (ur.role = 'supervisor'::public.app_role OR p.cooperativa_id = p_cooperative_id)
           AND p.is_active IS TRUE
           AND p.deleted_at IS NULL
           AND ur.role IN (
             'supervisor'::public.app_role,
             'gestor_compras'::public.app_role,
             'comprador_singular'::public.app_role
           )
      )
    )
  );
$function$
