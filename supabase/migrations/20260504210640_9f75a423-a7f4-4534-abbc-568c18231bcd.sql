ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS dnd_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dnd_start TIME WITHOUT TIME ZONE DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS dnd_end TIME WITHOUT TIME ZONE DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly')),
ADD COLUMN IF NOT EXISTS channel_priorities JSONB DEFAULT '{"email": 1, "push": 2, "whatsapp": 3}'::jsonb;

COMMENT ON COLUMN public.notification_preferences.dnd_enabled IS 'Se as notificações devem ser silenciadas em horários específicos';
COMMENT ON COLUMN public.notification_preferences.digest_enabled IS 'Se o usuário prefere receber resumos periódicos em vez de alertas imediatos';