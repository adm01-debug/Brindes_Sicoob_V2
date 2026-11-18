CREATE OR REPLACE FUNCTION public.validate_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fulfillment_status IS NOT NULL AND NEW.fulfillment_status NOT IN (
    'unfulfilled', 'partially_fulfilled', 'fulfilled',
    'in_production', 'in_separation', 'in_transit', 'delivered', 'completed', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
  END IF;
  RETURN NEW;
END;
$function$
