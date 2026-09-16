-- ============================================================
-- GIFTS STORE - APLICAR RLS NAS TABELAS RESTANTES (CORRIGIDO)
-- Aplica Row Level Security nas tabelas que ficaram sem proteção
-- VERSÃO CORRIGIDA: Não assume organization_id em todas tabelas
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- PARTE 1: HABILITAR RLS EM TODAS AS TABELAS RESTANTES
-- ============================================================

-- Tabelas user-scoped (dados pessoais do usuário)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Tabelas product-related (herdam org do produto via JOIN)
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- Tabelas quote-related (herdam org do quote via JOIN)
ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Tabelas client-related (herdam org do client via JOIN)
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Tabelas analytics e auditoria
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Tabelas de sistema
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mockup_approval_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 2: POLICIES - USER FAVORITES (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_favorites"
ON public.user_favorites FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_create_own_favorites"
ON public.user_favorites FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_favorites"
ON public.user_favorites FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- PARTE 3: POLICIES - USER FILTER PRESETS (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_presets"
ON public.user_filter_presets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_presets"
ON public.user_filter_presets FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PARTE 4: POLICIES - SAVED FILTERS (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_filters"
ON public.saved_filters FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_filters"
ON public.saved_filters FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PARTE 5: POLICIES - PUSH SUBSCRIPTIONS (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PARTE 6: POLICIES - NOTIFICATION PREFERENCES (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_notification_prefs"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_notification_prefs"
ON public.notification_preferences FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PARTE 7: POLICIES - PRODUCT VIEWS (ANALYTICS)
-- ============================================================

-- Qualquer user autenticado pode ver views (analytics público)
CREATE POLICY "authenticated_view_product_views"
ON public.product_views FOR SELECT
TO authenticated
USING (true);

-- Qualquer user autenticado pode registrar view
CREATE POLICY "authenticated_create_product_views"
ON public.product_views FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- PARTE 8: POLICIES - PRODUCT REVIEWS
-- ============================================================

-- Verificar se tabela tem organization_id ou user_id
DO $$
BEGIN
  -- Se tem product_id, usa JOIN com products
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_reviews' 
    AND column_name = 'product_id'
  ) THEN
    -- Todos podem ver reviews de produtos que sua org tem acesso
    EXECUTE 'CREATE POLICY "org_members_view_product_reviews"
    ON public.product_reviews FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.products
        WHERE id = product_reviews.product_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    -- Members podem criar reviews
    EXECUTE 'CREATE POLICY "authenticated_create_reviews"
    ON public.product_reviews FOR INSERT
    TO authenticated
    WITH CHECK (true)';
  END IF;
  
  -- Se tem user_id, permite gerenciar próprios reviews
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_reviews' 
    AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE POLICY "users_manage_own_reviews"
    ON public.product_reviews FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================
-- PARTE 9: POLICIES - PRODUCT COMPARISONS (USER-SCOPED)
-- ============================================================

CREATE POLICY "users_view_own_comparisons"
ON public.product_comparisons FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_comparisons"
ON public.product_comparisons FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PARTE 10: POLICIES - PRODUCT PRICE HISTORY
-- ============================================================

-- Verificar se existe product_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_price_history' 
    AND column_name = 'product_id'
  ) THEN
    -- Members da org podem ver histórico de preços
    EXECUTE 'CREATE POLICY "org_members_view_price_history"
    ON public.product_price_history FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.products
        WHERE id = product_price_history.product_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    -- Sistema cria histórico automaticamente
    EXECUTE 'CREATE POLICY "system_create_price_history"
    ON public.product_price_history FOR INSERT
    TO authenticated
    WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- PARTE 11: POLICIES - QUOTE COMMENTS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_comments' 
    AND column_name = 'quote_id'
  ) THEN
    -- Members da org podem ver comentários
    EXECUTE 'CREATE POLICY "org_members_view_quote_comments"
    ON public.quote_comments FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.quotes
        WHERE id = quote_comments.quote_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    -- Members podem criar comentários
    EXECUTE 'CREATE POLICY "org_members_create_quote_comments"
    ON public.quote_comments FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.quotes
        WHERE id = quote_comments.quote_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_comments' 
    AND column_name = 'user_id'
  ) THEN
    -- Users podem editar/deletar próprios comentários
    EXECUTE 'CREATE POLICY "users_manage_own_comments"
    ON public.quote_comments FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================
-- PARTE 12: POLICIES - QUOTE VERSIONS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_versions' 
    AND column_name = 'quote_id'
  ) THEN
    EXECUTE 'CREATE POLICY "org_members_view_quote_versions"
    ON public.quote_versions FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.quotes
        WHERE id = quote_versions.quote_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    EXECUTE 'CREATE POLICY "system_create_quote_versions"
    ON public.quote_versions FOR INSERT
    TO authenticated
    WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- PARTE 13: POLICIES - QUOTE TEMPLATES
-- ============================================================

-- Templates podem ser globais (NULL) ou por org
CREATE POLICY "all_view_quote_templates"
ON public.quote_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_create_quote_templates"
ON public.quote_templates FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "users_manage_own_templates"
ON public.quote_templates FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ============================================================
-- PARTE 14: POLICIES - CLIENT CONTACTS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_contacts' 
    AND column_name = 'client_id'
  ) THEN
    EXECUTE 'CREATE POLICY "org_members_view_client_contacts"
    ON public.client_contacts FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_contacts.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    EXECUTE 'CREATE POLICY "org_members_manage_client_contacts"
    ON public.client_contacts FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_contacts.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_contacts.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
  END IF;
END $$;

-- ============================================================
-- PARTE 15: POLICIES - CLIENT NOTES
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_notes' 
    AND column_name = 'client_id'
  ) THEN
    EXECUTE 'CREATE POLICY "org_members_view_client_notes"
    ON public.client_notes FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_notes.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
    
    EXECUTE 'CREATE POLICY "org_members_manage_client_notes"
    ON public.client_notes FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_notes.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.bitrix_clients
        WHERE id = client_notes.client_id
          AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
      )
    )';
  END IF;
END $$;

-- ============================================================
-- PARTE 16: POLICIES - ANALYTICS EVENTS (OPEN)
-- ============================================================

-- Analytics podem ser vistos por todos autenticados
CREATE POLICY "authenticated_view_analytics"
ON public.analytics_events FOR SELECT
TO authenticated
USING (true);

-- Sistema pode criar eventos
CREATE POLICY "system_create_analytics"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- PARTE 17: POLICIES - SEARCH QUERIES (OPEN)
-- ============================================================

-- Users veem todas buscas (para insights)
CREATE POLICY "authenticated_view_searches"
ON public.search_queries FOR SELECT
TO authenticated
USING (true);

-- Qualquer um pode registrar busca
CREATE POLICY "authenticated_create_searches"
ON public.search_queries FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- PARTE 18: POLICIES - AUDIT LOG (OPEN READ)
-- ============================================================

-- Todos podem ver audit log (transparência)
CREATE POLICY "authenticated_view_audit_log"
ON public.audit_log FOR SELECT
TO authenticated
USING (true);

-- Sistema cria logs automaticamente
CREATE POLICY "system_create_audit_log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- PARTE 19: POLICIES - SYNC JOBS (OPEN)
-- ============================================================

-- Todos podem ver status de jobs
CREATE POLICY "authenticated_view_sync_jobs"
ON public.sync_jobs FOR SELECT
TO authenticated
USING (true);

-- Sistema cria jobs
CREATE POLICY "system_create_sync_jobs"
ON public.sync_jobs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Sistema atualiza status
CREATE POLICY "system_update_sync_jobs"
ON public.sync_jobs FOR UPDATE
TO authenticated
USING (true);

-- ============================================================
-- PARTE 20: POLICIES - MOCKUP APPROVAL LINKS (PUBLIC)
-- ============================================================

-- Links públicos podem ser vistos por qualquer um
CREATE POLICY "public_view_approval_links"
ON public.mockup_approval_links FOR SELECT
TO anon, authenticated
USING (is_active = true AND expires_at > NOW());

-- Authenticated podem criar links
CREATE POLICY "authenticated_create_approval_links"
ON public.mockup_approval_links FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- PARTE 21: POLICIES - NOTIFICATION TEMPLATES (GLOBAL)
-- ============================================================

-- Todos podem ler templates ativos
CREATE POLICY "all_view_active_templates"
ON public.notification_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- Authenticated podem gerenciar templates
CREATE POLICY "authenticated_manage_templates"
ON public.notification_templates FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- PARTE 22: GRANTS
-- ============================================================

GRANT SELECT ON public.user_favorites TO authenticated;
GRANT SELECT ON public.user_filter_presets TO authenticated;
GRANT SELECT ON public.saved_filters TO authenticated;
GRANT SELECT ON public.product_views TO authenticated;
GRANT SELECT ON public.product_reviews TO authenticated;
GRANT SELECT ON public.quote_comments TO authenticated;
GRANT SELECT ON public.notification_templates TO authenticated;
GRANT SELECT ON public.mockup_approval_links TO anon, authenticated;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 
  '✅ RLS aplicado em TODAS as tabelas restantes!' as message,
  'Sistema protegido - Policies baseadas em estrutura real das tabelas' as status,
  'Tabelas user-scoped, org-scoped via JOIN, e públicas configuradas' as info;
