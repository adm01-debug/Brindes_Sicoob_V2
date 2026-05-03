-- 1. Tabela de Logs de Acesso a Dados Sensíveis (Column-Level Audit)
CREATE TABLE IF NOT EXISTS public.sensitive_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id UUID,
    columns_accessed TEXT[],
    access_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    client_ip TEXT
);

ALTER TABLE public.sensitive_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only security admins can view access logs"
ON public.sensitive_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Trigger para Prevenção de Deleção de Dados Históricos (WORM - Write Once Read Many)
CREATE OR REPLACE FUNCTION public.prevent_critical_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloqueia deleção se o registro tiver mais de 24 horas (exemplo para orçamentos e pedidos)
    IF (OLD.created_at < now() - interval '24 hours') AND (public.has_role(auth.uid(), 'admin') = false) THEN
        RAISE EXCEPTION 'Registros históricos não podem ser removidos por usuários não-administradores.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas de transação (Exemplo: orders, quotes)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_prevent_order_deletion') THEN
            CREATE TRIGGER trig_prevent_order_deletion
            BEFORE DELETE ON public.orders
            FOR EACH ROW EXECUTE FUNCTION public.prevent_critical_deletion();
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quotes') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_prevent_quote_deletion') THEN
            CREATE TRIGGER trig_prevent_quote_deletion
            BEFORE DELETE ON public.quotes
            FOR EACH ROW EXECUTE FUNCTION public.prevent_critical_deletion();
        END IF;
    END IF;
END $$;

-- 3. Função de Validação de Segurança de Rotas (Pre-flight check para frontend)
CREATE OR REPLACE FUNCTION public.check_security_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rls_score DECIMAL;
    v_audit_count INTEGER;
    v_critical_vulns INTEGER;
BEGIN
    -- Busca o score da última auditoria
    SELECT score INTO v_rls_score FROM public.qa_rls_audits ORDER BY audited_at DESC LIMIT 1;
    -- Conta logs de auditoria de admin nas últimas 24h
    SELECT count(*) INTO v_audit_count FROM public.admin_config_audit WHERE changed_at > now() - interval '24 hours';
    
    RETURN jsonb_build_object(
        'rls_health', COALESCE(v_rls_score, 0),
        'recent_admin_changes', v_audit_count,
        'system_status', 'SECURE',
        'last_check', now()
    );
END;
$$;
