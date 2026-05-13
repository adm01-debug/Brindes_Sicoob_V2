-- Corrigindo C3: Restringir order_items (tratando order_id como texto para o join)
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.order_items;
CREATE POLICY "users_read_own_order_items" ON public.order_items FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE o.id::text = order_items.order_id 
    AND (o.seller_id = auth.uid() OR p.role IN ('admin', 'manager'))
  )
);

-- Corrigindo A1, A2: Garantir que grupos e componentes sejam apenas para autenticados
DROP POLICY IF EXISTS "Authenticated users can read groups" ON public.product_groups;
CREATE POLICY "authenticated_read_groups" ON public.product_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read members" ON public.product_group_members;
CREATE POLICY "authenticated_read_members" ON public.product_group_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read components" ON public.product_components;
CREATE POLICY "authenticated_read_components" ON public.product_components FOR SELECT TO authenticated USING (true);

-- Protegendo admin_audit_log para apenas admins/managers
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_view_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admins_view_audit_log" ON public.admin_audit_log;
CREATE POLICY "admins_view_audit_log" ON public.admin_audit_log FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Protegendo admin_config_audit
ALTER TABLE public.admin_config_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_view_config_audit" ON public.admin_config_audit;
CREATE POLICY "admins_view_config_audit" ON public.admin_config_audit FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);
