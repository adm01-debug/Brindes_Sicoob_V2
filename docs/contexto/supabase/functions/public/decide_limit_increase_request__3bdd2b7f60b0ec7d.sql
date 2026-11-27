CREATE OR REPLACE FUNCTION public.decide_limit_increase_request(p_request_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS limit_increase_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor          uuid := (SELECT auth.uid());
  v_reason         text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_request        public.limit_increase_requests;
  v_target         public.pa_budgets;
  v_competencia    timestamp;
  v_ano            int;
  v_mes            int;
  v_ocupada        numeric(14,2);
  v_limite_texto   text;
  v_tem_verba      boolean := FALSE;
BEGIN
  SELECT * INTO v_request
    FROM public.limit_increase_requests AS request
   WHERE request.id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de aumento de verba % não encontrada.', p_request_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Autoridade antes da situacao: sem esta ordem, quem nao pode ver o PA
  -- distinguiria solicitacao inexistente, pendente e ja decidida (oraculo de
  -- existencia e de resultado sobre dados fora do proprio escopo).
  IF NOT public.can_decide_limit_increase(p_request_id) THEN
    RAISE EXCEPTION 'Você não tem autoridade para decidir o aumento de verba deste PA.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_request.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi decidida (%).', v_request.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF NOT p_approve AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da recusa.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_approve THEN
    IF v_request.requested_limit IS NULL OR v_request.requested_limit <= 0 THEN
      RAISE EXCEPTION 'O limite solicitado (%) é inválido.', v_request.requested_limit
        USING ERRCODE = 'check_violation';
    END IF;

    -- Mesma competência que o consumo de verba usa: `sicoob_orders.created_at`
    -- cru, lido por EXTRACT em UTC (20261122120000:394-395, 449-450, 1069-1070,
    -- 1176-1177, 1256-1257). O fuso de São Paulo recuava 3h e, entre 21h e
    -- meia-noite do último dia do mês, elevava a verba do mês anterior — que
    -- nenhum pedido do mês novo lê.
    v_competencia := now();
    v_ano := EXTRACT(YEAR FROM v_competencia)::int;
    v_mes := EXTRACT(MONTH FROM v_competencia)::int;

    -- A verba do pedido não guarda competência: a decisão vale para a competência
    -- corrente. Antes esta seleção caía para "a verba aberta mais recente do PA"
    -- (ORDER BY ... ano DESC, mes DESC) e um pedido feito em novembro podia
    -- elevar a verba de outubro — mês que o solicitante nunca viu na tela.
    SELECT * INTO v_target
      FROM public.pa_budgets AS budget
     WHERE budget.pa_id = v_request.pa_id
       AND budget.ano = v_ano
       AND budget.mes = v_mes
     LIMIT 1
     FOR UPDATE;

    v_tem_verba := FOUND;

    IF v_tem_verba THEN
      IF v_target.fechada_em IS NOT NULL THEN
        RAISE EXCEPTION
          'A verba da competência %/% do PA já está fechada; não é possível elevar o limite de um mês encerrado.',
          v_target.mes, v_target.ano
          USING ERRCODE = 'object_not_in_prerequisite_state';
      END IF;

      v_ocupada := COALESCE(v_target.verba_reservada, 0)
                 + COALESCE(v_target.verba_comprometida, 0)
                 + COALESCE(v_target.verba_consumida, 0);

      IF v_request.requested_limit < v_ocupada THEN
        RAISE EXCEPTION
          'O limite solicitado (R$ %) é menor que a verba já ocupada na competência %/% (R$ %).',
          v_request.requested_limit, v_target.mes, v_target.ano, v_ocupada
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- Teto monotônico: o novo limite tem de ser maior que a verba hoje vigente
    -- (o maior entre a verba real da competência e a informada no pedido). Sem
    -- isso, aprovar um pedido antigo e menor rebaixava uma verba já elevada por
    -- outra aprovação — redução silenciosa que ninguém pediu.
    IF v_request.requested_limit <= GREATEST(
         COALESCE(v_target.verba_planejada, 0),
         COALESCE(v_request.current_limit, 0)
       ) THEN
      RAISE EXCEPTION
        'O novo limite (R$ %) precisa ser maior que a verba vigente (R$ %); este pedido foi superado por outra aprovação — recuse-o ou peça um novo aumento.',
        v_request.requested_limit,
        GREATEST(COALESCE(v_target.verba_planejada, 0), COALESCE(v_request.current_limit, 0))
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_tem_verba THEN
      -- verba_total é espelhado por trg_sync_pa_budget_planejada.
      UPDATE public.pa_budgets
         SET verba_planejada = v_request.requested_limit,
             updated_at = now()
       WHERE id = v_target.id;
    ELSE
      -- Sem verba cadastrada para a competência corrente: a aprovação cria a
      -- verba do mês com o teto aprovado (antes o efeito ia para outro mês).
      -- `limite_alcada` recebe o mesmo valor: sem alçada, todo pedido do PA
      -- exigiria aprovação e o aumento aprovado não destravava nada para quem
      -- solicitou.
      INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_planejada, limite_alcada)
      VALUES (v_request.pa_id, v_ano, v_mes, v_request.requested_limit, v_request.requested_limit, v_request.requested_limit);
    END IF;
  END IF;

  UPDATE public.limit_increase_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         approved_by = v_actor,
         rejection_reason = CASE WHEN p_approve THEN NULL ELSE v_reason END,
         updated_at = now()
   WHERE id = v_request.id
   RETURNING * INTO v_request;

  IF v_request.requested_by IS NOT NULL THEN
    SELECT translate(to_char(v_request.requested_limit, 'FM999999999990D00'), '.', ',')
      INTO v_limite_texto;

    PERFORM public.send_notification(
      v_request.requested_by,
      CASE WHEN p_approve THEN 'Aumento de verba aprovado' ELSE 'Aumento de verba recusado' END,
      format(
        CASE
          WHEN p_approve THEN 'Seu pedido de aumento de verba para R$ %s foi aprovado.'
          ELSE 'Seu pedido de aumento de verba para R$ %s foi recusado. Motivo: %s'
        END,
        v_limite_texto,
        COALESCE(v_reason, 'não informado')
      ),
      CASE WHEN p_approve THEN 'success' ELSE 'warning' END,
      'approval',
      '/pa/verba',
      jsonb_build_object(
        'limit_increase_request_id', v_request.id,
        'pa_id', v_request.pa_id,
        'status', v_request.status,
        'requested_limit', v_request.requested_limit
      )
    );
  END IF;

  RETURN v_request;
END;
$function$
