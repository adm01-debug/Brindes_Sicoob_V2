CREATE OR REPLACE FUNCTION public.fn_audit_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
        INSERT INTO public.order_audit_events (order_id, event_type, old_value, new_value, actor_id)
        VALUES (
            NEW.id, 
            'status_change', 
            jsonb_build_object('fulfillment_status', OLD.fulfillment_status),
            jsonb_build_object('fulfillment_status', NEW.fulfillment_status),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
