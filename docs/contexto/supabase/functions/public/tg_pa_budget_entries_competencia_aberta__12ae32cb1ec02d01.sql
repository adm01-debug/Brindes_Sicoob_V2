CREATE OR REPLACE FUNCTION public.tg_pa_budget_entries_competencia_aberta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fechada TIMESTAMPTZ;
BEGIN
  SELECT fechada_em INTO v_fechada
    FROM public.pa_budgets
   WHERE id = NEW.pa_budget_id;

  IF v_fechada IS NOT NULL THEN
    RAISE EXCEPTION 'Competência %/% fechada; movimentos de verba estão bloqueados.',
      NEW.competencia_mes, NEW.competencia_ano;
  END IF;

  RETURN NEW;
END;
$function$
