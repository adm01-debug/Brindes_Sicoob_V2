-- 1. Tabela de Auditoria de RLS
CREATE TABLE IF NOT EXISTS public.qa_rls_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tables_total INTEGER NOT NULL,
    tables_with_rls INTEGER NOT NULL,
    tables_missing_rls TEXT[] DEFAULT '{}',
    tables_permissive_rls TEXT[] DEFAULT '{}', -- Tabelas com "USING (true)"
    score DECIMAL(5,2) NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Habilitar RLS na tabela de auditoria (Apenas admins)
ALTER TABLE public.qa_rls_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage RLS audits"
ON public.qa_rls_audits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Função de Auditoria de RLS (Security Definer para acessar pg_catalog)
CREATE OR REPLACE FUNCTION public.audit_all_rls_compliance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_total INTEGER;
    v_with_rls INTEGER;
    v_missing TEXT[];
    v_permissive TEXT[];
    v_score DECIMAL(5,2);
    v_result JSONB;
BEGIN
    -- Contar tabelas no schema public
    SELECT count(*) INTO v_total FROM pg_tables WHERE schemaname = 'public';
    
    -- Tabelas com RLS habilitado
    SELECT count(*) INTO v_with_rls 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
    
    -- Listar tabelas sem RLS
    SELECT array_agg(relname) INTO v_missing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;
    
    -- Listar tabelas com políticas excessivamente permissivas (USING true)
    SELECT array_agg(DISTINCT tablename) INTO v_permissive
    FROM pg_policies
    WHERE schemaname = 'public' AND (qual = '(true)' OR with_check = '(true)');

    -- Calcular score (0-100)
    IF v_total > 0 THEN
        v_score := (v_with_rls::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_score := 100;
    END IF;

    -- Salvar auditoria
    INSERT INTO public.qa_rls_audits (tables_total, tables_with_rls, tables_missing_rls, tables_permissive_rls, score)
    VALUES (v_total, v_with_rls, COALESCE(v_missing, '{}'), COALESCE(v_permissive, '{}'), v_score);

    SELECT jsonb_build_object(
        'score', v_score,
        'total', v_total,
        'with_rls', v_with_rls,
        'missing', COALESCE(v_missing, '{}'),
        'permissive', COALESCE(v_permissive, '{}')
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 3. Log de Auditoria Crítica (Prevenção de Drift)
CREATE TABLE IF NOT EXISTS public.admin_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_config_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config audit"
ON public.admin_config_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para monitorar mudanças em tabelas de configuração do sistema
CREATE OR REPLACE FUNCTION public.fn_audit_config_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_config_audit (action_type, table_name, old_data, new_data, changed_by)
    VALUES (TG_OP, TG_TABLE_NAME, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar em tabelas sensíveis (Exemplo: user_roles, system_settings se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_roles') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_audit_user_roles') THEN
            CREATE TRIGGER trig_audit_user_roles
            AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_config_change();
        END IF;
    END IF;
END $$;
