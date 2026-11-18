CREATE OR REPLACE FUNCTION public.log_quote_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.quote_history (quote_id, user_id, action, description, old_value, new_value, metadata)
        VALUES (
            NEW.id, 
            auth.uid(), 
            'status_change', 
            'Status alterado de ' || OLD.status || ' para ' || NEW.status,
            OLD.status,
            NEW.status,
            jsonb_build_object('changed_at', now(), 'rejection_notes', NEW.rejection_notes)
        );
    END IF;
    RETURN NEW;
END;
$function$
