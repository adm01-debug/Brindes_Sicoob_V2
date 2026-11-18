CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_short text;
  max_num integer;
BEGIN
  year_short := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CASE WHEN split_part(order_number, '-', 3) ~ '^\d+$'
         THEN split_part(order_number, '-', 3)::integer
         ELSE 0 END
  ), 0)
  INTO max_num
  FROM public.orders
  WHERE order_number LIKE 'PED-' || year_short || '-%';
  
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PED-' || year_short || '-' || lpad((max_num + 1)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$
