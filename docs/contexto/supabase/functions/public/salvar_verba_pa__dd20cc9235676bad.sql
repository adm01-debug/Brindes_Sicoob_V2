CREATE OR REPLACE FUNCTION public.salvar_verba_pa(p_pa_id uuid, p_ano integer, p_mes integer, p_verba_total numeric, p_limite_alcada numeric DEFAULT NULL::numeric, p_observacoes text DEFAULT NULL::text, p_budget_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget_id uuid;
BEGIN
  IF p_pa_id IS NULL THEN
    RAISE EXCEPTION 'Informe o posto de atendimento da verba.' USING ERRCODE = '22023';
  END IF;

  IF p_budget_id IS NULL THEN
    -- Mesmo primeiro bloqueio da exclusao de PA. Sem ele o gatilho do teto
    -- pegaria o PA depois da verba e o deadlock continuaria possivel.
    PERFORM public._trava_pa_da_verba(p_pa_id);

    -- O id sai daqui em vez de vir de RETURNING: INSERT ... RETURNING exige
    -- que a linha nova esteja visivel pelas policies de SELECT do chamador, e
    -- quem tem autoridade de escrita sem leitura receberia um falso
    -- "new row violates row-level security policy". O grant de INSERT inclui
    -- a coluna id apenas para esta gravacao.
    v_budget_id := gen_random_uuid();

    INSERT INTO public.pa_budgets (id, pa_id, ano, mes, verba_total, limite_alcada, observacoes)
    VALUES (v_budget_id, p_pa_id, p_ano, p_mes, p_verba_total, p_limite_alcada, p_observacoes);
  ELSE
    -- PA e competencia nao mudam na edicao: os dois formularios desabilitam
    -- esses campos e o grant de UPDATE cobre so verba, alcada e observacoes.
    -- O bloqueio do PA vem antes do UPDATE para manter a ordem da exclusao em
    -- cascata (PA primeiro, verba depois) e o filtro de PA/competencia fica no
    -- WHERE: assim a edicao nao depende de a linha estar visivel pelas
    -- policies de SELECT, que escondem `pa_budgets` de quem so escreve.
    PERFORM public._trava_pa_da_verba(p_pa_id);

    UPDATE public.pa_budgets
       SET verba_total = p_verba_total,
           limite_alcada = p_limite_alcada,
           observacoes = p_observacoes
     WHERE id = p_budget_id
       AND pa_id = p_pa_id
       AND ano = p_ano
       AND mes = p_mes;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Verba nao encontrada para este posto e competencia.' USING ERRCODE = 'P0002';
    END IF;

    v_budget_id := p_budget_id;
  END IF;

  RETURN v_budget_id;
END;
$function$
