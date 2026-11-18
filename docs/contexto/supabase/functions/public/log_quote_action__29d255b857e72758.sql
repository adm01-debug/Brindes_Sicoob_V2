CREATE OR REPLACE FUNCTION public.log_quote_action(_quote_id uuid, _action text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.quote_audit_logs (quote_id, user_id, action, ip_address, user_agent, metadata)
    VALUES (
        _quote_id,
        auth.uid(),
        _action,
        current_setting('request.header.x-forwarded-for', true),
        current_setting('request.header.user-agent', true),
        _metadata
    );
END;
$function$
