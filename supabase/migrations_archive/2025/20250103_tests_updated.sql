-- ============================================================
-- GIFTS STORE - TEST QUERIES (COM PAYMENTS)
-- Queries para testar e validar o sistema
-- VERSÃO ATUALIZADA: Inclui validação de payments
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================================

SELECT 
  'TABELAS CRIADAS' as test_group,
  COUNT(*) as total_tables,
  string_agg(table_name, ', ' ORDER BY table_name) as table_names
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ============================================================
-- 2. VERIFICAR RLS HABILITADO
-- ============================================================

SELECT 
  'RLS STATUS' as test_group,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 3. VERIFICAR POLICIES CRIADAS
-- ============================================================

SELECT 
  'POLICIES' as test_group,
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- 4. VERIFICAR ENUMS CRIADOS
-- ============================================================

SELECT 
  'ENUMS' as test_group,
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================================
-- 5. VERIFICAR SEED DATA
-- ============================================================

-- Categorias
SELECT 
  'CATEGORIAS' as test_group,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM public.categories;

-- Técnicas de personalização
SELECT 
  'TÉCNICAS' as test_group,
  COUNT(*) as total,
  string_agg(name, ', ' ORDER BY name) as techniques
FROM public.personalization_techniques
WHERE is_active = true;

-- Feature Flags
SELECT 
  'FEATURE FLAGS' as test_group,
  flag_name,
  is_enabled,
  rollout_percentage
FROM public.feature_flags
ORDER BY flag_name;

-- System Settings
SELECT 
  'SYSTEM SETTINGS' as test_group,
  setting_key,
  setting_value,
  is_public
FROM public.system_settings
ORDER BY setting_key;

-- ============================================================
-- 6. TESTAR CONEXÃO BÁSICA
-- ============================================================

SELECT 
  'CONNECTION TEST' as test_group,
  current_user as connected_as,
  current_database() as database,
  version() as postgres_version,
  NOW() as current_time;

-- ============================================================
-- 7. VERIFICAR ÍNDICES
-- ============================================================

SELECT 
  'ÍNDICES' as test_group,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================
-- 8. VERIFICAR CONSTRAINTS
-- ============================================================

SELECT 
  'CONSTRAINTS' as test_group,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================
-- 9. VERIFICAR FOREIGN KEYS
-- ============================================================

SELECT 
  'FOREIGN KEYS' as test_group,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================
-- 10. VERIFICAR FUNÇÕES CRIADAS
-- ============================================================

SELECT 
  'FUNÇÕES' as test_group,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin', 
    'is_manager_or_admin', 
    'get_user_role',
    'is_order_owner',
    'sync_order_payment_status',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- ============================================================
-- 11. VERIFICAR TRIGGERS
-- ============================================================

SELECT 
  'TRIGGERS' as test_group,
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_statement as action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================
-- 12. ESTATÍSTICAS DAS TABELAS
-- ============================================================

SELECT 
  'ESTATÍSTICAS' as test_group,
  schemaname,
  relname as table_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- ============================================================
-- 13. TESTE DE INSERÇÃO (CATEGORIAS)
-- ============================================================

DO $$
BEGIN
  -- Tentar inserir
  INSERT INTO public.categories (name, slug, description, is_active)
  VALUES ('Teste Categoria', 'teste-categoria', 'Categoria de teste', true);
  
  RAISE NOTICE 'Inserção de categoria de teste: OK';
  
  -- Remover
  DELETE FROM public.categories WHERE slug = 'teste-categoria';
  
  RAISE NOTICE 'Remoção de categoria de teste: OK';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro no teste de inserção: %', SQLERRM;
END $$;

-- ============================================================
-- 14. VERIFICAR ESTRUTURA DE CADA MÓDULO
-- ============================================================

-- Módulo 1: Usuários
SELECT 
  'MÓDULO USUÁRIOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profiles') as profiles_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_sessions') as sessions_exists;

-- Módulo 2: Produtos
SELECT 
  'MÓDULO PRODUTOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'categories') as categories,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'suppliers') as suppliers,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'products') as products,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'product_variants') as variants,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'collections') as collections;

-- Módulo 3: Orçamentos
SELECT 
  'MÓDULO ORÇAMENTOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quotes') as quotes,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_items') as quote_items,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_templates') as templates,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_comments') as comments;

-- Módulo 4: Pedidos
SELECT 
  'MÓDULO PEDIDOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'orders') as orders,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'order_items') as order_items;

-- Módulo 5: Pagamentos (NOVO)
SELECT 
  'MÓDULO PAGAMENTOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'payments') as payments,
  (SELECT COUNT(*) FROM pg_type WHERE typname = 'payment_status') as payment_status_enum,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'is_order_owner') as owner_function,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'sync_payment_status') as sync_trigger;

-- Módulo 6: Mockups
SELECT 
  'MÓDULO MOCKUPS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'personalization_techniques') as techniques,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mockup_generation_jobs') as jobs,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'generated_mockups') as mockups,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mockup_approval_links') as approval_links;

-- Módulo 7: Notificações
SELECT 
  'MÓDULO NOTIFICAÇÕES' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications') as notifications,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_preferences') as preferences,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'push_subscriptions') as push;

-- Módulo 8: Analytics
SELECT 
  'MÓDULO ANALYTICS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_events') as events,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'product_views') as views,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'search_queries') as searches;

-- Módulo 9: Clientes
SELECT 
  'MÓDULO CLIENTES' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bitrix_clients') as clients,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_contacts') as contacts,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_notes') as notes;

-- ============================================================
-- 15. VALIDAÇÃO ESPECÍFICA: PAYMENTS
-- ============================================================

-- Verificar tabela payments
SELECT 
  'PAYMENTS TABLE' as validation,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'payments') as table_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'payments') as index_count;

-- Verificar colunas essenciais de payments
SELECT 
  'PAYMENTS COLUMNS' as validation,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'id') as has_id,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'order_id') as has_order_id,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount') as has_amount,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'method') as has_method,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'status') as has_status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'metadata') as has_metadata;

-- Verificar RLS em payments
SELECT 
  'PAYMENTS RLS' as validation,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'payments') as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'payments') as policy_count;

-- Verificar índices de payments
SELECT 
  'PAYMENTS INDEXES' as validation,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
ORDER BY indexname;

-- ============================================================
-- 16. RESUMO FINAL
-- ============================================================

SELECT 
  'RESUMO GERAL' as summary,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_type WHERE typname = 'payment_status') as payment_enum_exists,
  (SELECT COUNT(*) FROM public.categories) as total_categories,
  (SELECT COUNT(*) FROM public.personalization_techniques) as total_techniques,
  (SELECT COUNT(*) FROM public.feature_flags) as total_feature_flags;

-- ============================================================
-- 17. CHECKLIST DE VALIDAÇÃO COMPLETO
-- ============================================================

SELECT 
  'CHECKLIST' as validation,
  
  -- Tabelas
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 39 
    THEN '✅' 
    ELSE '❌' 
  END as "39_tabelas_criadas",
  
  -- Policies
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 28 
    THEN '✅' 
    ELSE '❌' 
  END as "policies_criadas",
  
  -- Índices
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') >= 42 
    THEN '✅' 
    ELSE '❌' 
  END as "indices_criados",
  
  -- Seed: Categorias
  CASE 
    WHEN (SELECT COUNT(*) FROM public.categories) >= 10 
    THEN '✅' 
    ELSE '❌' 
  END as "categorias_seed",
  
  -- Seed: Técnicas
  CASE 
    WHEN (SELECT COUNT(*) FROM public.personalization_techniques) >= 10 
    THEN '✅' 
    ELSE '❌' 
  END as "tecnicas_seed",
  
  -- Seed: Feature Flags
  CASE 
    WHEN (SELECT COUNT(*) FROM public.feature_flags) >= 8 
    THEN '✅' 
    ELSE '❌' 
  END as "feature_flags_seed",
  
  -- Payments: Tabela
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'payments') = 1 
    THEN '✅' 
    ELSE '❌' 
  END as "payments_table",
  
  -- Payments: Enum
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_type WHERE typname = 'payment_status') = 1 
    THEN '✅' 
    ELSE '❌' 
  END as "payment_enum",
  
  -- Payments: RLS
  CASE 
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'payments') = true 
    THEN '✅' 
    ELSE '❌' 
  END as "payments_rls",
  
  -- Payments: Função Owner
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'is_order_owner') = 1 
    THEN '✅' 
    ELSE '❌' 
  END as "owner_function";

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT 
  '🎉 TESTES CONCLUÍDOS!' as message,
  'Verifique os resultados acima - Sistema COM payments validado' as next_step;
