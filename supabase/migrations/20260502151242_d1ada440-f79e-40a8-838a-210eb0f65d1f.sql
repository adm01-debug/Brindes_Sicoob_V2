-- Tabela para armazenar logs de auditoria RLS
CREATE TABLE IF NOT EXISTS public.sicoob_rls_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    table_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success' | 'failure'
    issue_details TEXT,
    resolved BOOLEAN DEFAULT false
);

-- Habilitar RLS na tabela de logs para segurança
ALTER TABLE public.sicoob_rls_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view audit logs" 
ON public.sicoob_rls_audit_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Função principal de auditoria
CREATE OR REPLACE FUNCTION public.audit_sicoob_rls_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table TEXT;
    v_policy_exists BOOLEAN;
    v_rls_enabled BOOLEAN;
    v_tables_to_check TEXT[] := ARRAY['cooperativas', 'pa_budgets', 'sicoob_orders', 'sicoob_order_items', 'sicoob_order_history'];
BEGIN
    FOR v_table IN SELECT unnest(v_tables_to_check) LOOP
        -- 1. Verificar se RLS está habilitado
        SELECT relrowsecurity INTO v_rls_enabled 
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = v_table;

        IF NOT v_rls_enabled THEN
            INSERT INTO public.sicoob_rls_audit_logs (table_name, status, issue_details)
            VALUES (v_table, 'failure', 'RLS is DISABLED on this table');
            CONTINUE;
        END IF;

        -- 2. Verificar se existem políticas (evitar regressão de visibilidade total)
        SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table)
        INTO v_policy_exists;

        IF NOT v_policy_exists THEN
            INSERT INTO public.sicoob_rls_audit_logs (table_name, status, issue_details)
            VALUES (v_table, 'failure', 'No policies found. Table might be wide open or completely blocked.');
            CONTINUE;
        END IF;

        -- 3. Validação específica de isolamento (ex: deve conter filtro de PA ou Cooperativa)
        -- Nota: Esta é uma verificação heurística simples para o log
        IF v_table IN ('pa_budgets', 'sicoob_orders') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = v_table 
                AND (qual ILIKE '%pa_id%' OR qual ILIKE '%cooperativa_id%')
            ) THEN
                INSERT INTO public.sicoob_rls_audit_logs (table_name, status, issue_details)
                VALUES (v_table, 'failure', 'Missing mandatory PA/Cooperative isolation filters in policies');
                CONTINUE;
            END IF;
        END IF;

        -- Se chegou aqui, a tabela passou na auditoria básica
        INSERT INTO public.sicoob_rls_audit_logs (table_name, status)
        VALUES (v_table, 'success');
    END LOOP;
END;
$$;

-- Agendar a auditoria para rodar diariamente à meia-noite (requer pg_cron)
-- Se o pg_cron não estiver disponível, a função pode ser chamada via Edge Function
SELECT cron.schedule('audit-sicoob-rls', '0 0 * * *', 'SELECT public.audit_sicoob_rls_policies();')
WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
