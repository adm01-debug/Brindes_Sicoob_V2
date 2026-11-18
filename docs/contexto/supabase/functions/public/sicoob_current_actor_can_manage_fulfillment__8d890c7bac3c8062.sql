CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_manage_fulfillment(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), p_order_id);
$function$
