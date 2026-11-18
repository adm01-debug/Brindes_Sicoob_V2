CREATE OR REPLACE FUNCTION public.send_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_category text DEFAULT 'system'::text, p_action_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_notif_id UUID;
BEGIN
    INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_category, p_action_url, p_metadata)
    RETURNING id INTO v_notif_id;
    
    RETURN v_notif_id;
END;
$function$
