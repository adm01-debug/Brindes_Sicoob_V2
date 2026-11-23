CREATE OR REPLACE FUNCTION public.user_can_access_pa(p_pa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p_pa_id IS NOT NULL AND (
    public.is_admin((SELECT auth.uid()))
    OR p_pa_id = public.current_user_pa_id()
    OR EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = p_pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  );
$function$
