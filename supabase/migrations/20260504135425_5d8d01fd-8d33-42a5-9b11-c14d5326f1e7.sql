-- 1. Revogar acesso global de EXECUTE para todas as funções de PUBLIC
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. Restabelecer acesso APENAS para funções destinadas ao uso público/anônimo (whitelist de segurança)
DO $$
DECLARE
    f record;
    public_whitelist text[] := ARRAY[
        'check_rate_limit',
        'log_login_attempt',
        'get_visitor_info',
        'cnpj_lookup',
        'health_check',
        'system_healthcheck',
        'get_test_auth_integrity',
        'get_enum_values'
    ];
BEGIN
    FOR f IN SELECT pg_proc.proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE nspname = 'public' LOOP
        IF f.proname = ANY(public_whitelist) THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO PUBLIC', f.proname);
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO anon', f.proname);
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO authenticated', f.proname);
        END IF;
    END LOOP;
END $$;

-- 3. Restabelecer acesso para funções de Workflow e Negócio para usuários autenticados
DO $$
DECLARE
    f record;
    auth_whitelist text[] := ARRAY[
        'has_role',
        'acquire_ai_quota',
        'check_ai_quota',
        'approve_sicoob_order',
        'reject_sicoob_order',
        'escalate_sicoob_order',
        'check_budget_availability',
        'submit_quote_for_approval',
        'validate_user_access',
        'get_user_profile_complete'
    ];
BEGIN
    FOR f IN SELECT pg_proc.proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE nspname = 'public' LOOP
        IF f.proname = ANY(auth_whitelist) THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO authenticated', f.proname);
        END IF;
    END LOOP;
END $$;

-- 4. Funções de Gatilho (Triggers) devem ter acesso para os papéis que as disparam
DO $$
DECLARE
    f record;
BEGIN
    FOR f IN SELECT pg_proc.proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE nspname = 'public' AND prorettype = 'trigger'::regtype LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO authenticated', f.proname);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO postgres', f.proname);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO service_role', f.proname);
    END LOOP;
END $$;

-- 5. Garantir que service_role tenha acesso total
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
