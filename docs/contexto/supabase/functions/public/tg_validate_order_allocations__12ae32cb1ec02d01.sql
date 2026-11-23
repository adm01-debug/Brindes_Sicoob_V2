CREATE OR REPLACE FUNCTION public.tg_validate_order_allocations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(14,2);
  v_status TEXT;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(total_amount, 0), status
    INTO v_total, v_status
    FROM public.sicoob_orders WHERE id = v_order_id;

  PERFORM public.pa_budget_validate_allocations(v_order_id, v_total, v_status);
  RETURN NULL;
END;
$function$
