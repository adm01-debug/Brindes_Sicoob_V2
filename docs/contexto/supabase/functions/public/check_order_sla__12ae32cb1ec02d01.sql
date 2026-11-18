CREATE OR REPLACE FUNCTION public.check_order_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.sla_deadline IS NOT NULL THEN
        IF NEW.sla_deadline < now() THEN
            NEW.sla_status := 'critical';
        ELSIF NEW.sla_deadline < now() + interval '2 hours' THEN
            NEW.sla_status := 'warning';
        ELSE
            NEW.sla_status := 'normal';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
