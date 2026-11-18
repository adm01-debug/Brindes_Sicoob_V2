CREATE OR REPLACE FUNCTION public.sicoob_actor_can_approve(p_actor_id uuid, p_order_id uuid, p_board_only boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
      CROSS JOIN LATERAL public.get_sicoob_order_approval_policy(o.id) policy
     WHERE o.id = p_order_id
       AND (
         NOT policy.forbid_self_approval
         OR o.created_by IS DISTINCT FROM p_actor_id
       )
       AND EXISTS (
         SELECT 1
           FROM public.profiles p
          WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
            AND (
              NOT policy.require_active_membership
              OR (p.is_active IS TRUE AND p.deleted_at IS NULL)
            )
            AND (
              EXISTS (
                SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = p_actor_id
                   AND ur.role::text IN ('admin', 'dev', 'supervisor')
              )
              OR (
                NOT p_board_only
                AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = p_actor_id
                     AND ur.role::text IN ('gestor_compras', 'comprador_singular')
                )
                AND p.cooperativa_id = o.cooperative_id
              )
              OR (
                NOT p_board_only
                AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = p_actor_id
                     AND ur.role::text = 'gerente_pa'
                )
                AND p.pa_id = o.pa_id
              )
            )
       )
  );
$function$
