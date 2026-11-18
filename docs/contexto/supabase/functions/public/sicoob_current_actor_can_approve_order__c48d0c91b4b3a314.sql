CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_approve_order(p_order_id uuid, p_board_only boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_approve(auth.uid(), p_order_id, p_board_only);
$function$
