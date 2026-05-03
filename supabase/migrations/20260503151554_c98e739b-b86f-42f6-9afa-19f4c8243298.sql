-- Drop the previous table if it was created in this session to avoid duplication
DROP TABLE IF EXISTS public.notifications;

-- Create workspace_notifications table with standard schema
CREATE TABLE IF NOT EXISTS public.workspace_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    category TEXT NOT NULL DEFAULT 'system', -- 'quote', 'system', 'approval'
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- link to action (e.g. /orcamentos/ID)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
ON public.workspace_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.workspace_notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.workspace_notifications FOR DELETE 
USING (auth.uid() = user_id);

-- Create a helper function to send notifications more easily (can be called from triggers or app)
CREATE OR REPLACE FUNCTION public.send_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'system',
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_notif_id UUID;
BEGIN
    INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_category, p_action_url, p_metadata)
    RETURNING id INTO v_notif_id;
    
    RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
