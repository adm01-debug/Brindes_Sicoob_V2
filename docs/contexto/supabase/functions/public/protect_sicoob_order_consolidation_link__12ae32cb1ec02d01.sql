CREATE OR REPLACE FUNCTION public.protect_sicoob_order_consolidation_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.consolidation_id IS DISTINCT FROM OLD.consolidation_id
     AND current_setting('app.sicoob_consolidation_operation', true) IS DISTINCT FROM 'create' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O vínculo de consolidação exige o fluxo transacional.';
  END IF;
  RETURN NEW;
END;
$function$
