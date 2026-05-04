-- Canais de notificação
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'email', 'push', 'whatsapp', 'sms'
    provider_name TEXT NOT NULL, -- 'sendgrid', 'fcm', 'twilio'
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Digests (Resumos)
CREATE TABLE IF NOT EXISTS public.notification_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT,
    content_data JSONB NOT NULL, -- Array de notificações agrupadas
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notificações Agendadas
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    template_id TEXT,
    payload JSONB NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Logs de Notificação
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    provider_response JSONB,
    status TEXT NOT NULL, -- 'success', 'error'
    error_code TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage channels" ON public.notification_channels FOR ALL USING (true);
CREATE POLICY "Users can view their own digests" ON public.notification_digests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own scheduled" ON public.scheduled_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.notification_logs FOR SELECT USING (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX idx_scheduled_notif_status_time ON public.scheduled_notifications(status, scheduled_for);
CREATE INDEX idx_digests_user_status ON public.notification_digests(user_id, status);