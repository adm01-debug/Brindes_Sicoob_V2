CREATE OR REPLACE FUNCTION public.tg_set_order_cost_center()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cost_center_id IS NULL AND NEW.pa_id IS NOT NULL THEN
    SELECT b.cost_center_id INTO NEW.cost_center_id
      FROM public.pa_budgets b
     WHERE b.pa_id = NEW.pa_id
       AND b.ano = EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT
       AND b.mes = EXTRACT(MONTH FROM COALESCE(NEW.created_at, now()))::INT
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$
