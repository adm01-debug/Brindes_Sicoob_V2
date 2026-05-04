-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.pa_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id UUID REFERENCES public.postos_atendimento(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'slack')),
    webhook_url TEXT, -- for slack
    recipient_email TEXT, -- for email
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pa_id, channel)
);

-- Enable RLS
ALTER TABLE public.pa_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage notification settings') THEN
        CREATE POLICY "Admins can manage notification settings" 
        ON public.pa_notification_settings 
        FOR ALL 
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Managers can view their PA notification settings') THEN
        CREATE POLICY "Managers can view their PA notification settings" 
        ON public.pa_notification_settings 
        FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.pa_id = pa_notification_settings.pa_id
            AND (profiles.role IN ('gestor_pa', 'gestor_singular'))
          )
        );
    END IF;
END $$;
