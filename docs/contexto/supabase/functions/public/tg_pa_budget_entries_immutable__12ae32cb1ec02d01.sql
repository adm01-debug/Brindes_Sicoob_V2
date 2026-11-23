CREATE OR REPLACE FUNCTION public.tg_pa_budget_entries_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'O livro de verba é imutável; registre um evento de estorno ou ajuste.';
END;
$function$
