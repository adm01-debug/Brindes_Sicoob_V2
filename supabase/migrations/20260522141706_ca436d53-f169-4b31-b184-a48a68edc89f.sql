-- Create telemetry_events table if not exists
CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on telemetry_events
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own telemetry
CREATE POLICY "Users can insert telemetry" ON public.telemetry_events
    FOR INSERT WITH CHECK (true);

-- Allow admins to view all telemetry
CREATE POLICY "Admins can view telemetry" ON public.telemetry_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('dev', 'supervisor', 'gestor_compras')
        )
    );

-- Optimize access_blocked_log
CREATE INDEX IF NOT EXISTS idx_access_blocked_log_ip ON public.access_blocked_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_blocked_log_user ON public.access_blocked_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_blocked_log_created_at ON public.access_blocked_log(created_at DESC);

-- Optimize ip_whitelist
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_created_by ON public.ip_whitelist(created_by);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active ON public.ip_whitelist(is_active) WHERE is_active = true;

-- Optimize city_whitelist
CREATE INDEX IF NOT EXISTS idx_city_whitelist_lookup ON public.city_whitelist(country_code, is_active) WHERE is_active = true;

-- Optimize user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
