CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_finance(p_actor_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.sicoob_actor_can_manage_fulfillment(p_actor_id, p_order_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p_actor_id
        AND ur.role::text IN ('dev', 'supervisor', 'admin', 'manager', 'gestor_compras', 'comprador_singular')
    );
$function$
