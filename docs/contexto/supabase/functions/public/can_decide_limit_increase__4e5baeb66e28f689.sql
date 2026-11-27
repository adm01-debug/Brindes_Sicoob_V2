CREATE OR REPLACE FUNCTION public.can_decide_limit_increase(p_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND (
      public.is_admin((SELECT auth.uid()))
      OR EXISTS (
        SELECT 1
          FROM public.limit_increase_requests AS request
          JOIN public.postos_atendimento AS service_point
            ON service_point.id = request.pa_id
         WHERE request.id = p_request_id
           AND service_point.is_active IS TRUE
           AND service_point.cooperativa_id = public.current_user_cooperativa_id()
           AND public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
      )
    );
$function$
