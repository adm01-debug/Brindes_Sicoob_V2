CREATE OR REPLACE FUNCTION public.tg_cooperativa_budget_not_below_distributed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_distribuido numeric(14,2);
  v_detalhado   boolean;
BEGIN
  v_detalhado := public._pode_ver_verba_da_cooperativa(NEW.cooperativa_id);

  PERFORM public._trava_competencia_da_cooperativa(NEW.cooperativa_id, NEW.ano, NEW.mes);

  v_distribuido := public._cooperativa_verba_distribuida(NEW.cooperativa_id, NEW.ano, NEW.mes);

  IF v_distribuido > COALESCE(NEW.verba_total, 0) THEN
    IF v_detalhado THEN
      RAISE EXCEPTION
        'O teto da cooperativa (R$ %) ficaria abaixo do ja distribuido aos PAs (R$ %) em %/%. Reduza as verbas dos PAs antes de baixar o teto.',
        NEW.verba_total::text, round(v_distribuido, 2)::text, NEW.mes, NEW.ano
        USING ERRCODE = '23514';
    END IF;

    RAISE EXCEPTION 'O teto informado fica abaixo do ja distribuido nesta competencia.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
