CREATE OR REPLACE FUNCTION public.tg_pa_transfer_respects_cooperativa_ceiling()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_competencia record;
  v_teto        numeric(14,2);
  v_soma        numeric(14,2);
  v_detalhado   boolean;
BEGIN
  IF NEW.cooperativa_id IS NOT DISTINCT FROM OLD.cooperativa_id THEN
    RETURN NULL;
  END IF;

  v_detalhado := public._pode_ver_verba_da_cooperativa(NEW.cooperativa_id);

  FOR v_competencia IN
    SELECT DISTINCT pb.ano, pb.mes
      FROM public.pa_budgets pb
     WHERE pb.pa_id = NEW.id
     ORDER BY pb.ano, pb.mes
  LOOP
    PERFORM public._trava_competencia_da_cooperativa(
      NEW.cooperativa_id, v_competencia.ano, v_competencia.mes
    );

    SELECT cb.verba_total INTO v_teto
      FROM public.cooperativa_budgets cb
     WHERE cb.cooperativa_id = NEW.cooperativa_id
       AND cb.ano = v_competencia.ano
       AND cb.mes = v_competencia.mes;

    CONTINUE WHEN v_teto IS NULL;

    v_soma := public._cooperativa_verba_distribuida(
      NEW.cooperativa_id, v_competencia.ano, v_competencia.mes
    );

    IF v_soma > v_teto THEN
      IF v_detalhado THEN
        RAISE EXCEPTION
          'A transferencia levaria as verbas da cooperativa de destino a R$ % em %/%, acima do teto de R$ %. Ajuste o teto do destino ou reduza a verba do PA.',
          round(v_soma, 2)::text, v_competencia.mes, v_competencia.ano, v_teto::text
          USING ERRCODE = '23514';
      END IF;

      RAISE EXCEPTION 'A transferencia de PA ultrapassa o teto da cooperativa de destino.'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$function$
