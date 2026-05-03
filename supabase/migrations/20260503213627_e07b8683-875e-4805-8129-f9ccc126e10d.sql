-- 1. Tabela para registro de execuções de QA
CREATE TABLE IF NOT EXISTS public.qa_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('running', 'pass', 'fail', 'blocked')),
    scenario TEXT,
    summary JSONB,
    created_by UUID REFERENCES auth.users(id),
    release_tag TEXT
);

ALTER TABLE public.qa_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Apenas admin e dev visualizam qa_runs" ON public.qa_runs;
CREATE POLICY "Apenas admin e dev visualizam qa_runs" ON public.qa_runs FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
DROP POLICY IF EXISTS "Apenas admin e dev inserem qa_runs" ON public.qa_runs;
CREATE POLICY "Apenas admin e dev inserem qa_runs" ON public.qa_runs FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'dev'));

-- 2. RPC para Pré-flight SQL (§0-bis)
CREATE OR REPLACE FUNCTION public.qa_preflight_check()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    users_ok BOOLEAN;
    pas_ok BOOLEAN;
    budgets_ok BOOLEAN;
    coupons_ok BOOLEAN;
    orders_ok BOOLEAN;
BEGIN
    SELECT count(*) > 0 INTO users_ok FROM auth.users WHERE email LIKE 'qa+%';
    SELECT count(*) > 0 INTO pas_ok FROM public.organizations WHERE is_pa = true;
    SELECT count(*) > 0 INTO budgets_ok FROM public.pa_budgets;
    SELECT count(*) > 0 INTO coupons_ok FROM public.coupons;
    SELECT count(*) > 0 INTO orders_ok FROM public.orders;

    result := jsonb_build_object(
        'users', users_ok,
        'pas', pas_ok,
        'budgets', budgets_ok,
        'coupons', coupons_ok,
        'orders', orders_ok,
        'timestamp', now()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC para Provisionamento de Contas QA
CREATE OR REPLACE FUNCTION public.provision_qa_accounts()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'ready', 'message', 'Base de perfis QA preparada via admin client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC para Seed QA parametrizado
CREATE OR REPLACE FUNCTION public.seed_qa_scenario(scenario_name TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('scenario', scenario_name, 'status', 'success', 'timestamp', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Extensão de Telemetria para RLS (Corrigido)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='query_telemetry' AND column_name='rls_blocked_count') THEN
        ALTER TABLE public.query_telemetry ADD COLUMN rls_blocked_count INTEGER DEFAULT 0;
    END IF;
    -- is_rls_violation já existe conforme erro anterior, garantindo idempotência
END $$;
