CREATE OR REPLACE FUNCTION public.require_sicoob_artwork_before_production()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('logistic', 'in_production')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (
       NEW.requires_artwork IS TRUE
       OR NEW.is_pilot_order IS TRUE
       OR EXISTS (SELECT 1 FROM public.sicoob_order_artwork_versions a WHERE a.order_id = NEW.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.sicoob_order_artwork_versions a
       WHERE a.order_id = NEW.id AND a.is_latest AND a.status = 'approved'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A versão vigente da arte precisa estar aprovada antes da produção.';
  END IF;
  RETURN NEW;
END;
$function$
