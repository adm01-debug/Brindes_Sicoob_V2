-- Auditoria Administrativa
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PUBLISH'
    entity_type TEXT NOT NULL, -- 'PRODUCT', 'CATEGORY', 'CMS', 'USER', 'COUPON'
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" 
ON public.admin_audit_log FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')));

CREATE POLICY "System can insert audit logs" 
ON public.admin_audit_log FOR INSERT 
WITH CHECK (true); -- Permitimos inserção via app/functions

-- Tabela de Singularidades (Cooperativas)
CREATE TABLE IF NOT EXISTS public.pa_singularidades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pa_singularidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view singularidades" 
ON public.pa_singularidades FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage singularidades" 
ON public.pa_singularidades FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')));

-- Tabela de Pontos de Atendimento (PAs)
CREATE TABLE IF NOT EXISTS public.pontos_atendimento (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    singular_id UUID REFERENCES public.pa_singularidades(id),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pontos_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view points of service" 
ON public.pontos_atendimento FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage points of service" 
ON public.pontos_atendimento FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')));

-- Garantir RLS em tabelas críticas existentes se não estiverem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'newsletter_subscribers' AND rowsecurity = true) THEN
        ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política para newsletter (apenas admins veem lista)
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view newsletter subscribers" 
ON public.newsletter_subscribers FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'dev')));

-- Função para registrar auditoria automaticamente via trigger (opcional, mas bom para integridade)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN audit_action := 'CREATE';
    ELSIF (TG_OP = 'UPDATE') THEN audit_action := 'UPDATE';
    ELSIF (TG_OP = 'DELETE') THEN audit_action := 'DELETE';
    END IF;

    INSERT INTO public.admin_audit_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        auth.uid(), 
        audit_action, 
        TG_TABLE_NAME, 
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text 
            ELSE NEW.id::text 
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
