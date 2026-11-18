CREATE OR REPLACE FUNCTION public.set_quote_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pa_id uuid;
  v_cooperative_id uuid;
BEGIN
  IF current_setting('app.sicoob_reorder_operation', true) = 'create' THEN
    RETURN NEW;
  END IF;

  SELECT pa_id, cooperativa_id
    INTO v_pa_id, v_cooperative_id
    FROM public.profiles
   WHERE user_id = NEW.seller_id;

  NEW.pa_id := v_pa_id;
  NEW.singular_id := v_cooperative_id;
  RETURN NEW;
END;
$function$
