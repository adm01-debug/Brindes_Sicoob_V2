CREATE OR REPLACE FUNCTION public.audit_sicoob_order_item_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, new_data)
        VALUES (NEW.order_id, NEW.id, auth.uid(), 'INSERT', row_to_json(NEW)::jsonb);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, old_data, new_data)
        VALUES (NEW.order_id, NEW.id, auth.uid(), 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.sicoob_order_item_logs (order_id, item_id, user_id, action, old_data)
        VALUES (OLD.order_id, OLD.id, auth.uid(), 'DELETE', row_to_json(OLD)::jsonb);
    END IF;
    RETURN NULL;
END;
$function$
