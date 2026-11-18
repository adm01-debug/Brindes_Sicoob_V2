CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_view_all_consolidation(p_consolidation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_view_all_consolidation(auth.uid(), p_consolidation_id);
$function$
