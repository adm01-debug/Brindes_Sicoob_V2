CREATE OR REPLACE FUNCTION public.sicoob_actor_can_request_approval(p_actor_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_orders o
    JOIN public.profiles p ON p.user_id = p_actor_id OR p.id = p_actor_id
    WHERE o.id = p_order_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND (
        o.created_by = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id AND ur.role::text IN ('admin', 'dev', 'supervisor')
        )
        OR (
          p.cooperativa_id = o.cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
        )
        OR (
          p.pa_id = o.pa_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id AND ur.role::text IN ('gerente_pa', 'comprador_pac')
          )
        )
      )
  );
$function$
