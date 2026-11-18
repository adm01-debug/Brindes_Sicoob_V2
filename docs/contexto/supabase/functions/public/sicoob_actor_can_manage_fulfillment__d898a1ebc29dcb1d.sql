CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_fulfillment(p_actor_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT p_actor_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.sicoob_orders order_row
    WHERE order_row.id = p_order_id
      AND (
        order_row.created_by = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles actor_role
          WHERE actor_role.user_id = p_actor_id
            AND actor_role.role::text IN ('admin', 'manager', 'dev', 'supervisor')
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role::text IN ('gestor_compras', 'comprador_singular')
          )
          AND EXISTS (
            SELECT 1 FROM public.profiles actor_profile
            WHERE (actor_profile.user_id = p_actor_id OR actor_profile.id = p_actor_id)
              AND actor_profile.is_active IS TRUE
              AND actor_profile.deleted_at IS NULL
              AND actor_profile.cooperativa_id = order_row.cooperative_id
          )
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role::text IN ('gerente_pa', 'comprador_pac')
          )
          AND EXISTS (
            SELECT 1 FROM public.profiles actor_profile
            WHERE (actor_profile.user_id = p_actor_id OR actor_profile.id = p_actor_id)
              AND actor_profile.is_active IS TRUE
              AND actor_profile.deleted_at IS NULL
              AND actor_profile.pa_id = order_row.pa_id
          )
        )
      )
  );
$function$
