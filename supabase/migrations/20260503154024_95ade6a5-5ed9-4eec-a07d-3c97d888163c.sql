-- Update is_order_owner_or_admin to be more inclusive
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
$function$;

-- Hardening RLS for order_audit_events
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_owner_admin" ON public.order_audit_events;
DROP POLICY IF EXISTS "audit_select_scope" ON public.order_audit_events;
CREATE POLICY "audit_select_scope" ON public.order_audit_events
FOR SELECT TO authenticated
USING (
  is_order_owner_or_admin(order_id)
  OR EXISTS (
    SELECT 1 FROM sicoob_orders so
    WHERE so.id = order_id
    AND (
      so.created_by = auth.uid()
      OR (is_gerente_pa() AND so.pa_id = current_user_pa_id())
      OR (is_gestor_compras() AND so.cooperative_id = current_user_cooperativa_id())
      OR is_admin(auth.uid())
    )
  )
);

-- Hardening RLS for order_comments
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_owner_admin" ON public.order_comments;
DROP POLICY IF EXISTS "comments_select_scope" ON public.order_comments;
CREATE POLICY "comments_select_scope" ON public.order_comments
FOR SELECT TO authenticated
USING (
  (NOT is_internal OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) OR has_role(auth.uid(), 'gestor_compras'::app_role))
  AND (
    is_order_owner_or_admin(order_id)
    OR EXISTS (
      SELECT 1 FROM sicoob_orders so
      WHERE so.id = order_id
      AND (
        so.created_by = auth.uid()
        OR (is_gerente_pa() AND so.pa_id = current_user_pa_id())
        OR (is_gestor_compras() AND so.cooperative_id = current_user_cooperativa_id())
        OR is_admin(auth.uid())
      )
    )
  )
);
