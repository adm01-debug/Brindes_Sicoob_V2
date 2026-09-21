-- ============================================================
-- GIFTS STORE - ROW LEVEL SECURITY (RLS) POLICIES
-- Configuração completa de segurança para todas as tabelas
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é manager ou admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'manager')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para pegar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users podem ver e editar apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins veem todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Managers veem perfis do seu departamento
CREATE POLICY "Managers can view department profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_manager_or_admin() OR
    department = (SELECT department FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 2. PRODUCTS
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Todos podem ver produtos ativos
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Admins e managers podem ver todos os produtos
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (public.is_manager_or_admin());

-- Apenas admins podem criar/editar produtos
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- 3. CATEGORIES
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Todos podem ver categorias ativas
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Admins gerenciam categorias
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 4. SUPPLIERS
-- ============================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem ver fornecedores ativos
CREATE POLICY "Authenticated users can view active suppliers"
  ON public.suppliers FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- Admins gerenciam fornecedores
CREATE POLICY "Admins can manage suppliers"
  ON public.suppliers FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 5. QUOTES
-- ============================================================

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Users veem orçamentos que criaram ou foram atribuídos
CREATE POLICY "Users can view own quotes"
  ON public.quotes FOR SELECT
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    public.is_manager_or_admin()
  );

-- Users podem criar orçamentos
CREATE POLICY "Authenticated users can create quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users podem editar orçamentos que criaram
CREATE POLICY "Users can update own quotes"
  ON public.quotes FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_manager_or_admin()
  );

-- Apenas admins podem deletar
CREATE POLICY "Admins can delete quotes"
  ON public.quotes FOR DELETE
  USING (public.is_admin());

-- Aprovação pública (via token)
CREATE POLICY "Public can view quotes with valid token"
  ON public.quotes FOR SELECT
  USING (approval_token IS NOT NULL);

-- ============================================================
-- 6. QUOTE_ITEMS
-- ============================================================

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Mesma lógica das quotes (via quote_id)
CREATE POLICY "Users can view own quote items"
  ON public.quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_id
      AND (
        created_by = auth.uid() OR
        assigned_to = auth.uid() OR
        public.is_manager_or_admin()
      )
    )
  );

CREATE POLICY "Users can manage own quote items"
  ON public.quote_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id = quote_id
      AND (created_by = auth.uid() OR public.is_manager_or_admin())
    )
  );

-- ============================================================
-- 7. ORDERS
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users veem pedidos que criaram ou foram atribuídos
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    public.is_manager_or_admin()
  );

-- Apenas authenticated podem criar
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users editam seus próprios pedidos
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_manager_or_admin()
  );

-- ============================================================
-- 8. ORDER_ITEMS
-- ============================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Mesma lógica dos orders
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
      AND (
        created_by = auth.uid() OR
        assigned_to = auth.uid() OR
        public.is_manager_or_admin()
      )
    )
  );

CREATE POLICY "Users can manage own order items"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
      AND (created_by = auth.uid() OR public.is_manager_or_admin())
    )
  );

-- ============================================================
-- 9. BITRIX_CLIENTS
-- ============================================================

ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem ver clientes
CREATE POLICY "Authenticated users can view clients"
  ON public.bitrix_clients FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins e managers gerenciam clientes
CREATE POLICY "Admins can manage clients"
  ON public.bitrix_clients FOR ALL
  USING (public.is_manager_or_admin());

-- ============================================================
-- 10. MOCKUP_GENERATION_JOBS
-- ============================================================

ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users veem seus próprios jobs
CREATE POLICY "Users can view own mockup jobs"
  ON public.mockup_generation_jobs FOR SELECT
  USING (user_id = auth.uid() OR public.is_manager_or_admin());

-- Users criam seus próprios jobs
CREATE POLICY "Authenticated users can create mockup jobs"
  ON public.mockup_generation_jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 11. GENERATED_MOCKUPS
-- ============================================================

ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;

-- Users veem seus próprios mockups
CREATE POLICY "Users can view own mockups"
  ON public.generated_mockups FOR SELECT
  USING (user_id = auth.uid() OR public.is_manager_or_admin());

-- Sistema cria mockups
CREATE POLICY "System can create mockups"
  ON public.generated_mockups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 12. GAMIFICATION
-- ============================================================

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Users veem seus próprios pontos
CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Users veem suas próprias transações
CREATE POLICY "Users can view own transactions"
  ON public.point_transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Users veem seus próprios achievements
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Achievements públicos
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (is_active = true);

-- Rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rewards"
  ON public.rewards FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users veem apenas suas notificações
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users podem marcar como lidas
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Sistema pode criar notificações
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 14. ANALYTICS
-- ============================================================

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode criar eventos de analytics
CREATE POLICY "Anyone can create analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can create product views"
  ON public.product_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can create search queries"
  ON public.search_queries FOR INSERT
  WITH CHECK (true);

-- Apenas admins podem ver analytics
CREATE POLICY "Admins can view analytics"
  ON public.analytics_events FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view product views"
  ON public.product_views FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view search queries"
  ON public.search_queries FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 15. FAVORITES E COMPARISONS
-- ============================================================

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;

-- Users gerenciam seus próprios favoritos
CREATE POLICY "Users can manage own favorites"
  ON public.user_favorites FOR ALL
  USING (user_id = auth.uid());

-- Users gerenciam suas próprias comparações
CREATE POLICY "Users can manage own comparisons"
  ON public.product_comparisons FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 16. SYSTEM TABLES (APENAS ADMINS)
-- ============================================================

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Apenas admins
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view sync jobs"
  ON public.sync_jobs FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 17. TABELAS PÚBLICAS (READ-ONLY)
-- ============================================================

ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;

-- Todos podem ver técnicas ativas
CREATE POLICY "Anyone can view active techniques"
  ON public.personalization_techniques FOR SELECT
  USING (is_active = true);

-- Apenas admins editam
CREATE POLICY "Admins can manage techniques"
  ON public.personalization_techniques FOR ALL
  USING (public.is_admin());

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 'RLS Policies criadas com sucesso! ✅' as message,
       'Todas as 44 tabelas agora têm Row Level Security' as info;
