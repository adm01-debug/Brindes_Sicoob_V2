CREATE OR REPLACE FUNCTION public.log_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor_name text;
BEGIN
  IF (TG_OP = 'UPDATE') AND (NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT COALESCE(p.full_name, p.email, 'Sistema') INTO _actor_name
      FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;

    INSERT INTO public.order_audit_events (order_id, event_type, event_category, actor_id, actor_name, description, metadata)
    VALUES (
      NEW.id,
      'status_changed',
      'status',
      auth.uid(),
      _actor_name,
      format('Status alterado de %s → %s', COALESCE(OLD.fulfillment_status, '-'), COALESCE(NEW.fulfillment_status, '-')),
      jsonb_build_object(
        'old_status', OLD.status, 'new_status', NEW.status,
        'old_fulfillment', OLD.fulfillment_status, 'new_fulfillment', NEW.fulfillment_status
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
