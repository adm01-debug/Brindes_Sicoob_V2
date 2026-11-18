CREATE OR REPLACE FUNCTION public.get_sicoob_order_shipment(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(s)
  FROM public.sicoob_order_shipments s
  WHERE s.order_id = p_order_id;
$function$
