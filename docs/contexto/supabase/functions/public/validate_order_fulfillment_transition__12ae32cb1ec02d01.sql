CREATE OR REPLACE FUNCTION public.validate_order_fulfillment_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.fulfillment_status IS NOT DISTINCT FROM NEW.fulfillment_status THEN
    RETURN NEW;
  END IF;

  IF (OLD.fulfillment_status = 'unfulfilled'
      AND NEW.fulfillment_status NOT IN ('partially_fulfilled', 'fulfilled'))
     OR (OLD.fulfillment_status = 'partially_fulfilled'
         AND NEW.fulfillment_status <> 'fulfilled')
     OR OLD.fulfillment_status = 'fulfilled' THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %',
      OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  RETURN NEW;
END;
$function$
