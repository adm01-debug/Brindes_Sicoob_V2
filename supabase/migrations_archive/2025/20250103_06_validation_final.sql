-- ============================================================
-- GIFTS STORE - VALIDAÇÃO FINAL COMPLETA
-- Verifica que TODAS as tabelas têm RLS ativo
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- 1. VERIFICAR TABELAS SEM RLS (DEVE SER 0!)
-- ============================================================

SELECT 
  '⚠️ TABELAS SEM RLS' as alert,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA - PERFEITO!'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' TABELAS SEM PROTEÇÃO!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Listar quais tabelas ainda estão sem RLS (se houver)
SELECT 
  'LISTA DE TABELAS SEM RLS' as info,
  tablename,
  '❌ SEM RLS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- ============================================================
-- 2. VERIFICAR TABELAS COM RLS (DEVE SER 38+!)
-- ============================================================

SELECT 
  '✅ TABELAS COM RLS' as info,
  COUNT(*) as count,
  'Esperado: 38+' as expected
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- ============================================================
-- 3. TOTAL DE POLICIES CRIADAS
-- ============================================================

SELECT 
  '📜 TOTAL DE POLICIES' as info,
  COUNT(*) as total_policies,
  'Esperado: 80+' as expected
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================================
-- 4. POLICIES POR TABELA
-- ============================================================

SELECT 
  '📊 POLICIES POR TABELA' as info,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ SEM POLICIES'
    WHEN COUNT(*) < 2 THEN '⚠️ POUCAS POLICIES'
    ELSE '✅ OK'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

-- ============================================================
-- 5. TABELAS COM RLS MAS SEM POLICIES (BLOQUEADAS!)
-- ============================================================

SELECT 
  '⚠️ TABELAS BLOQUEADAS (RLS SEM POLICIES)' as alert,
  COUNT(*) as count
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname
      AND p.tablename = t.tablename
  );

-- Listar tabelas bloqueadas
SELECT 
  'TABELAS BLOQUEADAS' as info,
  t.tablename,
  '⚠️ RLS ATIVO MAS SEM POLICIES' as problem
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname
      AND p.tablename = t.tablename
  )
ORDER BY t.tablename;

-- ============================================================
-- 6. VERIFICAR FUNÇÕES ESSENCIAIS
-- ============================================================

SELECT 
  '🔧 FUNÇÕES ESSENCIAIS' as info,
  routine_name,
  CASE 
    WHEN routine_name IN (
      'is_org_admin',
      'is_org_owner_or_admin',
      'user_is_org_member',
      'prevent_removing_last_owner'
    ) THEN '✅'
    ELSE '❓'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_org_admin',
    'is_org_owner_or_admin',
    'user_is_org_member',
    'prevent_removing_last_owner',
    'update_updated_at_column',
    'sync_order_payment_status'
  )
ORDER BY routine_name;

-- ============================================================
-- 7. VERIFICAR TABELAS ESPECÍFICAS IMPORTANTES
-- ============================================================

SELECT 
  '🎯 TABELAS CRÍTICAS' as info,
  tablename,
  rowsecurity as rls_enabled,
  (
    SELECT COUNT(*) 
    FROM pg_policies p 
    WHERE p.tablename = t.tablename 
      AND p.schemaname = 'public'
  ) as policy_count,
  CASE 
    WHEN rowsecurity = false THEN '❌ RLS DESABILITADO'
    WHEN (
      SELECT COUNT(*) 
      FROM pg_policies p 
      WHERE p.tablename = t.tablename 
        AND p.schemaname = 'public'
    ) = 0 THEN '⚠️ SEM POLICIES'
    ELSE '✅ PROTEGIDO'
  END as status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'products',
    'quotes',
    'orders',
    'payments',
    'bitrix_clients',
    'categories',
    'suppliers',
    'collections',
    'organizations',
    'user_organizations'
  )
ORDER BY t.tablename;

-- ============================================================
-- 8. RESUMO EXECUTIVO FINAL
-- ============================================================

SELECT 
  '📊 RESUMO EXECUTIVO FINAL' as title,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) as tables_without_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (
    SELECT COUNT(*) 
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
          AND p.tablename = t.tablename
      )
  ) as blocked_tables,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0
    THEN '✅ SISTEMA 100% PROTEGIDO'
    ELSE '❌ AINDA HÁ TABELAS SEM PROTEÇÃO'
  END as final_status;

-- ============================================================
-- 9. CHECKLIST FINAL DE SEGURANÇA
-- ============================================================

SELECT 
  '✅ CHECKLIST FINAL DE SEGURANÇA' as validation,
  
  -- Nenhuma tabela sem RLS
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0
    THEN '✅' 
    ELSE '❌' 
  END as "zero_unrestricted_tables",
  
  -- Todas as tabelas têm policies
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM pg_tables t
      WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
        AND NOT EXISTS (
          SELECT 1 FROM pg_policies p
          WHERE p.schemaname = t.schemaname
            AND p.tablename = t.tablename
        )
    )
    THEN '✅' 
    ELSE '❌' 
  END as "all_tables_have_policies",
  
  -- Organizations existe
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organizations') 
    THEN '✅' 
    ELSE '❌' 
  END as "organizations_exists",
  
  -- Funções de org existem
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.routines 
      WHERE routine_name IN ('is_org_admin', 'is_org_owner_or_admin', 'user_is_org_member')
    ) = 3
    THEN '✅' 
    ELSE '❌' 
  END as "org_functions_exist",
  
  -- Payments protegido
  CASE 
    WHEN (
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'payments'
    ) = true
    AND (
      SELECT COUNT(*) FROM pg_policies WHERE tablename = 'payments'
    ) >= 2
    THEN '✅' 
    ELSE '❌' 
  END as "payments_protected",
  
  -- Gamificação removida
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename IN ('rewards', 'achievements', 'user_points')
    )
    THEN '✅' 
    ELSE '❌' 
  END as "gamification_removed",
  
  -- Seed data inserido
  CASE 
    WHEN (SELECT COUNT(*) FROM public.categories) >= 10
    AND (SELECT COUNT(*) FROM public.personalization_techniques) >= 10
    THEN '✅' 
    ELSE '❌' 
  END as "seed_data_inserted",
  
  -- 80+ policies criadas
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 80
    THEN '✅' 
    ELSE '❌' 
  END as "enough_policies";

-- ============================================================
-- 10. PRÓXIMOS PASSOS
-- ============================================================

SELECT 
  '🚀 PRÓXIMOS PASSOS' as info,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0
    THEN 'Sistema 100% protegido! Próximo: Criar primeira Organization'
    ELSE 'Execute novamente o arquivo 05_APPLY_RLS_REMAINING.sql'
  END as next_step;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0
    THEN '🎉 PARABÉNS! SISTEMA 100% SEGURO!'
    ELSE '⚠️ ATENÇÃO: AINDA HÁ TABELAS SEM PROTEÇÃO'
  END as message,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0
    THEN 'Todas as tabelas têm RLS ativo e policies configuradas'
    ELSE 'Execute 05_APPLY_RLS_REMAINING.sql para completar a proteção'
  END as status;
