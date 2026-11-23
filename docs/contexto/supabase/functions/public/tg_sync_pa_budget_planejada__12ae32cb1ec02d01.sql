CREATE OR REPLACE FUNCTION public.tg_sync_pa_budget_planejada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verba_planejada IS NULL OR NEW.verba_planejada = 0 THEN
      NEW.verba_planejada := COALESCE(NEW.verba_total, 0);
    ELSE
      NEW.verba_total := NEW.verba_planejada;
    END IF;
  ELSE
    IF NEW.verba_planejada IS DISTINCT FROM OLD.verba_planejada THEN
      NEW.verba_total := NEW.verba_planejada;
    ELSIF NEW.verba_total IS DISTINCT FROM OLD.verba_total THEN
      NEW.verba_planejada := NEW.verba_total;
    END IF;
  END IF;
  NEW.verba_total := NEW.verba_planejada;
  RETURN NEW;
END;
$function$
