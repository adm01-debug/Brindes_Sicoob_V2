CREATE OR REPLACE FUNCTION public.sicoob_actor_can_receive_consolidation(p_actor_id uuid, p_consolidation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.sicoob_delivery_destinations d ON d.pa_id = p.pa_id
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND d.consolidation_id = p_consolidation_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_actor_id
          AND ur.role::text IN ('gerente_pa', 'comprador_pac')
      )
  );
$function$
