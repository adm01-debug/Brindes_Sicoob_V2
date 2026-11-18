CREATE OR REPLACE FUNCTION public.sicoob_actor_can_view_all_consolidation(p_actor_id uuid, p_consolidation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.order_consolidations c
    WHERE c.id = p_consolidation_id
      AND (
        c.vendedor_id = p_actor_id
        OR public.sicoob_actor_can_manage_consolidation(p_actor_id, c.singular_id)
      )
  );
$function$
