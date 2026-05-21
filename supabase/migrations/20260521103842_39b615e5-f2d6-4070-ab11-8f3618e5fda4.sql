-- Funções de Sistema (Pilar de Segurança)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1
$$;

-- Tabelas de Segurança de Acesso
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.city_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  state TEXT,
  country_code TEXT NOT NULL DEFAULT 'BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(city_name, state, country_code)
);

CREATE TABLE IF NOT EXISTS public.access_blocked_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  ip_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  block_reason TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.access_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
  city_whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
  block_unknown_locations BOOLEAN NOT NULL DEFAULT false,
  max_failed_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 15,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabelas de Dispositivos
CREATE TABLE IF NOT EXISTS public.user_known_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  browser_name TEXT,
  os_name TEXT,
  device_type TEXT,
  location TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.device_login_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id UUID REFERENCES public.user_known_devices(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  location TEXT,
  notification_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- View de Telemetria
CREATE OR REPLACE VIEW public.telemetry_query_performance AS
SELECT 
  id,
  operation,
  table_name,
  duration_ms,
  severity,
  error_message,
  user_id,
  created_at
FROM public.query_telemetry;

-- RLS e Políticas
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_blocked_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_known_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_login_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage IP whitelist') THEN
        CREATE POLICY "Admin manage IP whitelist" ON public.ip_whitelist FOR ALL USING (public.can_manage(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage city whitelist') THEN
        CREATE POLICY "Admin manage city whitelist" ON public.city_whitelist FOR ALL USING (public.can_manage(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System insert blocked logs') THEN
        CREATE POLICY "System insert blocked logs" ON public.access_blocked_log FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own devices') THEN
        CREATE POLICY "Users view own devices" ON public.user_known_devices FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Configuração Padrão
INSERT INTO public.access_security_settings (ip_whitelist_enabled, city_whitelist_enabled)
SELECT false, false
WHERE NOT EXISTS (SELECT 1 FROM public.access_security_settings);