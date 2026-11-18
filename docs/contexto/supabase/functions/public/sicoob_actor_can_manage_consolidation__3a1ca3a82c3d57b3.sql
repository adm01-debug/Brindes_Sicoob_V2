CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_consolidation(p_actor_id uuid, p_cooperative_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND p.is_active IS TRUE
      AND (p.deleted_at IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id AND ur.role::text IN ('dev', 'supervisor')
        )
        OR (
          p.cooperativa_id = p_cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
        )
      )
  );
$function$
