CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_receive_destination(p_destination_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_receive_destination(auth.uid(), p_destination_id);
$function$
