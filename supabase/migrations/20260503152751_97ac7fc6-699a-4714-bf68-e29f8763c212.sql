-- Ensure notifications table exists (from migration 001)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  category TEXT DEFAULT 'system',
  source_system TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id UUID,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  group_key TEXT,
  is_grouped BOOLEAN DEFAULT false,
  group_count INT DEFAULT 1,
  action_url TEXT,
  action_label TEXT,
  action_data JSONB,
  priority INT DEFAULT 0,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_status JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Systems can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Update order_audit_events if needed
ALTER TABLE public.order_audit_events ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.order_audit_events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'status_change';
ALTER TABLE public.order_audit_events ADD COLUMN IF NOT EXISTS observations TEXT;

-- Create a helper function to log audit events
CREATE OR REPLACE FUNCTION public.log_order_audit_event(
  p_order_id UUID,
  p_event_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_created_by UUID DEFAULT auth.uid(),
  p_created_by_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general',
  p_observations TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.order_audit_events (
    order_id, event_type, description, metadata, created_by, created_by_name, category, observations
  ) VALUES (
    p_order_id, p_event_type, p_description, p_metadata, p_created_by, p_created_by_name, p_category, p_observations
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
