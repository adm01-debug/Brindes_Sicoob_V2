-- 1. ADICIONAR ÍNDICES ESTRATÉGICOS PARA RLS
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_cooperative_id ON public.sicoob_orders (cooperative_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_pa_id ON public.sicoob_orders (pa_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_created_by ON public.sicoob_orders (created_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_items_order_id ON public.sicoob_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cooperativa_id ON public.profiles (cooperativa_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pa_id ON public.profiles (pa_id);

-- 2. OTIMIZAR FUNÇÕES DE CONTEXTO
CREATE OR REPLACE FUNCTION public.current_user_pa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_cooperativa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cooperativa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. REESCREVER POLICIES EM SICOOB_ORDERS
DROP POLICY IF EXISTS "Gerentes can view their PA orders" ON public.sicoob_orders;
CREATE POLICY "Gerentes can view their PA orders" ON public.sicoob_orders
FOR SELECT TO authenticated
USING (
  is_gerente_pa() AND pa_id = current_user_pa_id()
);

DROP POLICY IF EXISTS "Gestores can view their cooperative orders" ON public.sicoob_orders;
CREATE POLICY "Gestores can view their cooperative orders" ON public.sicoob_orders
FOR SELECT TO authenticated
USING (
  is_gestor_compras() AND cooperative_id = current_user_cooperativa_id()
);

DROP POLICY IF EXISTS "Vendedores can view their own orders" ON public.sicoob_orders;
CREATE POLICY "Vendedores can view their own orders" ON public.sicoob_orders
FOR SELECT TO authenticated
USING (
  is_vendedor_role() AND created_by = auth.uid()
);

-- 4. REESCREVER POLICIES EM PROFILES
DROP POLICY IF EXISTS "Gerente PA can view PA profiles" ON public.profiles;
CREATE POLICY "Gerente PA can view PA profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  is_gerente_pa() AND pa_id = current_user_pa_id()
);

DROP POLICY IF EXISTS "Gestor Compras can view cooperative profiles" ON public.profiles;
CREATE POLICY "Gestor Compras can view cooperative profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  is_gestor_compras() AND cooperativa_id = current_user_cooperativa_id()
);
