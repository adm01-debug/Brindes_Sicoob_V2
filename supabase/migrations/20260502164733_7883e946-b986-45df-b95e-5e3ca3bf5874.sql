-- Limpeza simplificada (sem a tabela quotes que deu erro de coluna)
DO $$ 
BEGIN
    -- 1. Remover pedidos de teste
    DELETE FROM public.sicoob_orders 
    WHERE created_by IN (
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000007'
    );

    -- 2. Remover logs de auditoria
    DELETE FROM public.admin_audit_log 
    WHERE user_id IN (
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000007'
    );

    -- 3. Remover perfis
    DELETE FROM public.profiles 
    WHERE user_id IN (
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000007'
    );

    -- 4. Remover do auth.users
    DELETE FROM auth.users 
    WHERE id IN (
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000007'
    );
END $$;