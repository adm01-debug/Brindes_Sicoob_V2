CREATE OR REPLACE FUNCTION public.check_fulfillment_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se o status não mudou, ok
    IF (OLD.fulfillment_status = NEW.fulfillment_status) THEN
        RETURN NEW;
    END IF;

    -- Regras de transição (mesma lógica do frontend para consistência)
    -- pending -> [in_production, cancelled]
    -- in_production -> [in_separation, cancelled]
    -- in_separation -> [in_transit, cancelled]
    -- in_transit -> [delivered, cancelled]
    -- delivered -> [completed, cancelled]
    
    IF (OLD.fulfillment_status = 'pending' AND NEW.fulfillment_status NOT IN ('in_production', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_production' AND NEW.fulfillment_status NOT IN ('in_separation', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_separation' AND NEW.fulfillment_status NOT IN ('in_transit', 'cancelled')) OR
       (OLD.fulfillment_status = 'in_transit' AND NEW.fulfillment_status NOT IN ('delivered', 'cancelled')) OR
       (OLD.fulfillment_status = 'delivered' AND NEW.fulfillment_status NOT IN ('completed', 'cancelled')) OR
       (OLD.fulfillment_status = 'completed') OR
       (OLD.fulfillment_status = 'cancelled') THEN
        RAISE EXCEPTION 'Transição de status de fulfillment inválida: de % para %', OLD.fulfillment_status, NEW.fulfillment_status;
    END IF;

    RETURN NEW;
END;
$function$
