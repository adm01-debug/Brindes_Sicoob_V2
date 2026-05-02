-- Função para verificar integridade de usuários de teste via SQL direto (paridade auth.users <-> auth.identities)
CREATE OR REPLACE FUNCTION public.get_test_auth_integrity(test_emails TEXT[])
RETURNS TABLE (
    email TEXT,
    user_id UUID,
    exists_in_users BOOLEAN,
    has_identities BOOLEAN,
    is_valid BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    WITH target_emails AS (
        SELECT unnest(test_emails) as target_email
    )
    SELECT 
        te.target_email as email,
        u.id as user_id,
        (u.id IS NOT NULL) as exists_in_users,
        (EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) as has_identities,
        (u.id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) as is_valid
    FROM target_emails te
    LEFT JOIN auth.users u ON lower(u.email) = lower(te.target_email);
END;
$$;

-- Função para limpar usuários órfãos (existem em auth.users mas não em auth.identities)
CREATE OR REPLACE FUNCTION public.cleanup_test_auth_orphans(test_ids UUID[])
RETURNS TABLE (
    deleted_id UUID,
    email TEXT,
    success BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    curr_id UUID;
    curr_email TEXT;
BEGIN
    FOR curr_id, curr_email IN 
        SELECT id, email FROM auth.users 
        WHERE id = ANY(test_ids) 
        AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = auth.users.id)
    LOOP
        -- Limpar dependências para evitar erros de FK
        DELETE FROM public.sicoob_orders WHERE created_by = curr_id;
        DELETE FROM public.profiles WHERE user_id = curr_id;
        DELETE FROM public.user_roles WHERE user_id = curr_id;
        DELETE FROM public.postos_atendimento WHERE cooperativa_id IN (SELECT id FROM public.profiles WHERE user_id = curr_id); -- Casos extremos
        
        -- Deletar do auth.users
        DELETE FROM auth.users WHERE id = curr_id;
        
        deleted_id := curr_id;
        email := curr_email;
        success := TRUE;
        RETURN NEXT;
    END LOOP;
END;
$$;
