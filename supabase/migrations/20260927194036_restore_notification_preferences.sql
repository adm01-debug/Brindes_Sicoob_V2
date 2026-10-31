-- Restaura a tabela exigida pelo trigger de cadastro do Supabase Auth.
-- A migration histórica constava no repositório, mas a tabela não existia no
-- projeto canônico; todo novo usuário abortava com erro 500.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT false,
  whatsapp_enabled boolean DEFAULT false,
  events_config jsonb DEFAULT '{"order_status_change": true, "pilot_update": true, "new_order": true}'::jsonb,
  dnd_enabled boolean DEFAULT false,
  dnd_start time without time zone DEFAULT '22:00:00',
  dnd_end time without time zone DEFAULT '08:00:00',
  digest_enabled boolean DEFAULT false,
  digest_frequency text DEFAULT 'daily',
  channel_priorities jsonb DEFAULT '{"email": 1, "push": 2, "whatsapp": 3}'::jsonb
);

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS events_config jsonb DEFAULT '{"order_status_change": true, "pilot_update": true, "new_order": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS dnd_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnd_start time without time zone DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS dnd_end time without time zone DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS channel_priorities jsonb DEFAULT '{"email": 1, "push": 2, "whatsapp": 3}'::jsonb;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_own_rows ON public.notification_preferences;
CREATE POLICY notification_preferences_own_rows
ON public.notification_preferences
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
REVOKE ALL ON public.notification_preferences FROM anon;

CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_default_notification_preferences() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_notification_preferences() TO supabase_auth_admin, service_role;

INSERT INTO public.notification_preferences (user_id)
SELECT id
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

DROP TRIGGER IF EXISTS on_user_created_preferences ON auth.users;
CREATE TRIGGER on_user_created_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();

COMMENT ON TABLE public.notification_preferences IS
  'Preferências privadas de entrega e agrupamento de notificações de cada usuário.';
