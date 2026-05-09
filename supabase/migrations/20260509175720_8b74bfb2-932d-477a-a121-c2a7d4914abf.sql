-- Adicionar preferências ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quote_preferences JSONB DEFAULT '{"showPrices": true, "showPhotos": true, "showTotals": true}'::jsonb;

-- Criar tabela de auditoria detalhada
CREATE TABLE IF NOT EXISTS public.quote_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'view', 'download', 'sign', 'update'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.quote_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins can view all audit logs"
ON public.quote_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view audit logs for their own quotes"
ON public.quote_audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quotes
        WHERE id = quote_audit_logs.quote_id
        AND seller_id = auth.uid()
    )
);

-- Função para registrar auditoria via RPC (opcional, mas útil para o frontend)
CREATE OR REPLACE FUNCTION public.log_quote_action(
    _quote_id UUID,
    _action TEXT,
    _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.quote_audit_logs (quote_id, user_id, action, ip_address, user_agent, metadata)
    VALUES (
        _quote_id,
        auth.uid(),
        _action,
        current_setting('request.header.x-forwarded-for', true),
        current_setting('request.header.user-agent', true),
        _metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
