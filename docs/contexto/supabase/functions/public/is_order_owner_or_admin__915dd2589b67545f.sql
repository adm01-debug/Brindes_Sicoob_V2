CREATE OR REPLACE FUNCTION public.is_order_owner_or_admin(_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE o.id = _order_id
      AND (
        o.seller_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR public.has_role(auth.uid(), 'dev'::app_role)
        OR (public.has_role(auth.uid(), 'gerente_pa'::app_role) AND o.organization_id = p.pa_id)
        OR (public.has_role(auth.uid(), 'gestor_compras'::app_role) AND (
            SELECT cooperativa_id FROM postos_atendimento WHERE id = o.organization_id
        ) = p.cooperativa_id)
      )
  )
$function$
