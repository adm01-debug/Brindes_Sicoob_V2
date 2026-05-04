-- Limites por categoria (ex: Brindes Especiais podem ter limite menor que Papelaria)
CREATE TABLE IF NOT EXISTS public.pa_category_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id UUID REFERENCES public.postos_atendimento(id) ON DELETE CASCADE,
    category_id INTEGER, 
    limite_alcada DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pa_id, category_id)
);

-- Configuração de canais de notificação para gestores
CREATE TABLE IF NOT EXISTS public.manager_notification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    slack_webhook_url TEXT,
    email_enabled BOOLEAN DEFAULT true,
    slack_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.pa_category_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage category thresholds" ON public.pa_category_thresholds FOR ALL USING (true);
CREATE POLICY "Managers can manage their own configs" ON public.manager_notification_config FOR ALL USING (auth.uid() = user_id);

-- Índice para busca rápida de limite por categoria
CREATE INDEX idx_category_threshold_lookup ON public.pa_category_thresholds(pa_id, category_id);