CREATE OR REPLACE FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cooperativa_id     uuid;
  v_cooperativa_antiga uuid;
  v_teto               numeric(14,2);
  v_distribuido        numeric(14,2);
  v_total              numeric(14,2);
  v_valor_novo         numeric(14,2);
  v_valor_antigo       numeric(14,2);
  v_detalhado          boolean;
BEGIN
  -- `verba_planejada` é o valor autoritativo desde o livro de verba; o gatilho
  -- `trg_sync_pa_budget_planejada` só espelha para `verba_total` DEPOIS deste
  -- (a ordem dos gatilhos BEFORE é alfabética). Ler `NEW.verba_total` aqui dava
  -- o valor antigo quando a decisão de aumento gravava `verba_planejada`, e a
  -- aprovação passava por cima do teto da cooperativa sem ser notada.
  IF TG_OP = 'INSERT' THEN
    -- `verba_planejada` tem DEFAULT 0: no INSERT o valor autoritativo e
    -- `verba_total`, porque o espelho (`trg_sync_pa_budget_planejada`) so roda
    -- depois deste gatilho, em ordem alfabetica. Preferir a coluna zerada aqui
    -- fazia toda verba inserida entrar como 0 e passar pelo teto.
    v_valor_novo := COALESCE(NULLIF(NEW.verba_planejada, 0), NEW.verba_total, 0);
  ELSE
    v_valor_novo := COALESCE(
      CASE WHEN NEW.verba_planejada IS DISTINCT FROM OLD.verba_planejada
           THEN NEW.verba_planejada END,
      CASE WHEN NEW.verba_total IS DISTINCT FROM OLD.verba_total
           THEN NEW.verba_total END,
      NEW.verba_planejada,
      NEW.verba_total,
      0
    );
    v_valor_antigo := COALESCE(
      CASE WHEN NEW.verba_planejada IS DISTINCT FROM OLD.verba_planejada
           THEN OLD.verba_planejada END,
      CASE WHEN NEW.verba_total IS DISTINCT FROM OLD.verba_total
           THEN OLD.verba_total END,
      OLD.verba_planejada,
      OLD.verba_total,
      0
    );
  END IF;
  -- FOR SHARE: espera uma transferencia de PA em andamento e o relê já no
  -- destino, para nao validar a verba contra o teto da Singular de origem.
  SELECT pa.cooperativa_id INTO v_cooperativa_id
    FROM public.postos_atendimento pa
   WHERE pa.id = NEW.pa_id
     FOR SHARE;

  IF v_cooperativa_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_detalhado := public._pode_ver_verba_da_cooperativa(v_cooperativa_id);

  PERFORM public._trava_competencia_da_cooperativa(v_cooperativa_id, NEW.ano, NEW.mes);

  -- `verba_total` e o teto da cooperativa cobrado dos PAs; `teto_verba_pa` e
  -- apenas o saldo inicial da tela e nao serve como limite.
  SELECT cb.verba_total INTO v_teto
    FROM public.cooperativa_budgets cb
   WHERE cb.cooperativa_id = v_cooperativa_id
     AND cb.ano = NEW.ano
     AND cb.mes = NEW.mes;

  IF v_teto IS NULL THEN
    RETURN NEW;
  END IF;

  v_distribuido := public._cooperativa_verba_distribuida(v_cooperativa_id, NEW.ano, NEW.mes);

  IF TG_OP = 'UPDATE' THEN
    SELECT pa.cooperativa_id INTO v_cooperativa_antiga
      FROM public.postos_atendimento pa
     WHERE pa.id = OLD.pa_id;

    -- O valor antigo so faz parte da soma da competencia de destino quando a
    -- competencia nao mudou; ao mover entre meses ele pertence a outra soma.
    IF v_cooperativa_antiga IS NOT DISTINCT FROM v_cooperativa_id
       AND OLD.ano = NEW.ano
       AND OLD.mes = NEW.mes THEN
      v_distribuido := v_distribuido - v_valor_antigo;
    END IF;
  END IF;

  v_total := v_distribuido + v_valor_novo;

  IF v_total > v_teto THEN
    IF v_detalhado THEN
      RAISE EXCEPTION
        'A soma das verbas dos PAs (R$ %) passaria do teto da cooperativa (R$ %) em %/%; ajuste o teto ou reduza a verba de outro PA.',
        round(v_total, 2)::text, v_teto::text, NEW.mes, NEW.ano
        USING ERRCODE = '23514';
    END IF;

    RAISE EXCEPTION 'As verbas desta competencia ultrapassam o teto da cooperativa.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
