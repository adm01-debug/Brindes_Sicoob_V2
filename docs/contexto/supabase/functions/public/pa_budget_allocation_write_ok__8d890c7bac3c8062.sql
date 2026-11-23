CREATE OR REPLACE FUNCTION public.pa_budget_allocation_write_ok(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p_order_id IS NOT NULL AND (
    public.is_admin((SELECT auth.uid()))
    OR (
      (public.is_gestor_compras() OR public.user_is_comprador_singular())
      AND public.sicoob_current_actor_can_read_order(p_order_id)
    )
  );
$function$
