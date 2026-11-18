CREATE OR REPLACE FUNCTION public.audit_sicoob_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actor_profile RECORD;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Get actor profile info
        SELECT full_name, role INTO actor_profile FROM public.profiles WHERE id = auth.uid();
        
        INSERT INTO public.order_audit_events (
            order_id,
            event_type,
            actor_id,
            actor_name,
            actor_role,
            description,
            old_value,
            new_value,
            created_at
        ) VALUES (
            NEW.id,
            'status_change',
            auth.uid(),
            COALESCE(actor_profile.full_name, 'Sistema'),
            actor_profile.role,
            'Mudança de status do pedido: ' || OLD.status || ' -> ' || NEW.status,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            now()
        );
    END IF;
    RETURN NEW;
END;
$function$
