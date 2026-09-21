-- ============================================================
-- GIFTS STORE - RLS COM ORGANIZATIONS (MULTI-TENANT)
-- Aplica Row Level Security baseado em Organizations
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- PARTE 1: ADICIONAR organization_id NAS TABELAS PRINCIPAIS
-- ============================================================

-- Categorias (organization-scoped)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_org 
ON public.categories(organization_id);

-- Fornecedores (organization-scoped)
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_suppliers_org 
ON public.suppliers(organization_id);

-- Produtos (organization-scoped)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_org 
ON public.products(organization_id);

-- Orçamentos (organization-scoped)
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quotes_org 
ON public.quotes(organization_id);

-- Pedidos (organization-scoped)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_org 
ON public.orders(organization_id);

-- Clientes Bitrix (organization-scoped)
ALTER TABLE public.bitrix_clients 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bitrix_clients_org 
ON public.bitrix_clients(organization_id);

-- Jobs de Mockup (organization-scoped)
ALTER TABLE public.mockup_generation_jobs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mockup_jobs_org 
ON public.mockup_generation_jobs(organization_id);

-- Collections (organization-scoped)
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collections_org 
ON public.collections(organization_id);

-- ============================================================
-- PARTE 2: FUNÇÃO HELPER - Verificar se user pertence à org
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- PARTE 3: APLICAR RLS EM TODAS AS TABELAS
-- ============================================================

-- Habilitar RLS em todas as tabelas principais
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 4: POLICIES - CATEGORIES
-- ============================================================

-- Members podem ver categorias da org
CREATE POLICY "org_members_view_categories"
ON public.categories FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

-- Admins podem criar categorias
CREATE POLICY "org_admins_create_categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- Admins podem editar categorias
CREATE POLICY "org_admins_update_categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_org_owner_or_admin(organization_id))
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- Admins podem deletar categorias
CREATE POLICY "org_admins_delete_categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 5: POLICIES - SUPPLIERS
-- ============================================================

CREATE POLICY "org_members_view_suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_admins_manage_suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.is_org_owner_or_admin(organization_id))
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 6: POLICIES - PRODUCTS
-- ============================================================

CREATE POLICY "org_members_view_products"
ON public.products FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_admins_manage_products"
ON public.products FOR ALL
TO authenticated
USING (public.is_org_owner_or_admin(organization_id))
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 7: POLICIES - PRODUCT_VARIANTS
-- ============================================================

-- Variants herdam org do produto pai
CREATE POLICY "org_members_view_variants"
ON public.product_variants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_variants.product_id
      AND public.user_is_org_member(organization_id)
  )
);

CREATE POLICY "org_admins_manage_variants"
ON public.product_variants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_variants.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_variants.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
);

-- ============================================================
-- PARTE 8: POLICIES - QUOTES
-- ============================================================

CREATE POLICY "org_members_view_quotes"
ON public.quotes FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_create_quotes"
ON public.quotes FOR INSERT
TO authenticated
WITH CHECK (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_update_own_quotes"
ON public.quotes FOR UPDATE
TO authenticated
USING (
  public.user_is_org_member(organization_id) 
  AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
);

CREATE POLICY "org_admins_delete_quotes"
ON public.quotes FOR DELETE
TO authenticated
USING (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 9: POLICIES - QUOTE_ITEMS
-- ============================================================

CREATE POLICY "org_members_view_quote_items"
ON public.quote_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE id = quote_items.quote_id
      AND public.user_is_org_member(organization_id)
  )
);

CREATE POLICY "org_members_manage_quote_items"
ON public.quote_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE id = quote_items.quote_id
      AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE id = quote_items.quote_id
      AND public.user_is_org_member(organization_id)
  )
);

-- ============================================================
-- PARTE 10: POLICIES - ORDERS
-- ============================================================

CREATE POLICY "org_members_view_orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_create_orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.user_is_org_member(organization_id)
  AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
);

CREATE POLICY "org_admins_delete_orders"
ON public.orders FOR DELETE
TO authenticated
USING (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 11: POLICIES - ORDER_ITEMS
-- ============================================================

CREATE POLICY "org_members_view_order_items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
      AND public.user_is_org_member(organization_id)
  )
);

CREATE POLICY "org_members_manage_order_items"
ON public.order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
      AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
      AND public.user_is_org_member(organization_id)
  )
);

-- ============================================================
-- PARTE 12: POLICIES - PAYMENTS
-- ============================================================

CREATE POLICY "org_members_view_payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = payments.order_id
      AND public.user_is_org_member(organization_id)
  )
);

CREATE POLICY "org_admins_manage_payments"
ON public.payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = payments.order_id
      AND public.is_org_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = payments.order_id
      AND public.user_is_org_member(organization_id)
  )
);

-- ============================================================
-- PARTE 13: POLICIES - BITRIX_CLIENTS
-- ============================================================

CREATE POLICY "org_members_view_clients"
ON public.bitrix_clients FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_admins_manage_clients"
ON public.bitrix_clients FOR ALL
TO authenticated
USING (public.is_org_owner_or_admin(organization_id))
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 14: POLICIES - MOCKUPS
-- ============================================================

CREATE POLICY "org_members_view_mockup_jobs"
ON public.mockup_generation_jobs FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_create_mockup_jobs"
ON public.mockup_generation_jobs FOR INSERT
TO authenticated
WITH CHECK (public.user_is_org_member(organization_id));

CREATE POLICY "org_members_view_generated_mockups"
ON public.generated_mockups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mockup_generation_jobs
    WHERE id = generated_mockups.job_id
      AND public.user_is_org_member(organization_id)
  )
);

-- ============================================================
-- PARTE 15: POLICIES - COLLECTIONS
-- ============================================================

CREATE POLICY "org_members_view_collections"
ON public.collections FOR SELECT
TO authenticated
USING (public.user_is_org_member(organization_id));

CREATE POLICY "org_admins_manage_collections"
ON public.collections FOR ALL
TO authenticated
USING (public.is_org_owner_or_admin(organization_id))
WITH CHECK (public.is_org_owner_or_admin(organization_id));

-- ============================================================
-- PARTE 16: POLICIES - PERSONALIZATION_TECHNIQUES (GLOBAL)
-- ============================================================

-- Técnicas de personalização são globais (todas orgs usam)
CREATE POLICY "anyone_view_techniques"
ON public.personalization_techniques FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "admins_manage_techniques"
ON public.personalization_techniques FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================================
-- PARTE 17: POLICIES - NOTIFICATIONS (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- PARTE 18: POLICIES - SYSTEM TABLES (ADMIN ONLY)
-- ============================================================

CREATE POLICY "admins_view_feature_flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "admins_manage_system_settings"
ON public.system_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================================
-- PARTE 19: GRANTS
-- ============================================================

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.suppliers TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.quotes TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.payments TO authenticated;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 
  '✅ RLS com Organizations aplicado com sucesso!' as message,
  'Sistema multi-tenant ativo - Users compartilham dados por Organization' as info;
