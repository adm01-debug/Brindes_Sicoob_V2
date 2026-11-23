CREATE OR REPLACE FUNCTION public.pa_budget_apply_state(p_order_id uuid, p_total numeric, p_cost_center_id uuid, p_para_estado text, p_motivo text DEFAULT NULL::text, p_pa_id uuid DEFAULT NULL::uuid, p_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS pa_budgets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget_id UUID;
  v_budget public.pa_budgets%ROWTYPE;
  v_total NUMERIC(14,2);
  v_cc UUID;
  v_pa_id UUID;
  v_created TIMESTAMPTZ;
  v_atual TEXT;
  v_atual_valor NUMERIC(14,2);
  v_pendente NUMERIC(14,2);
BEGIN
  IF p_para_estado NOT IN ('reservado', 'comprometido', 'consumido', 'liberado') THEN
    RAISE EXCEPTION 'Estado de verba inválido: %', p_para_estado;
  END IF;

  v_pa_id := p_pa_id;
  v_created := p_created_at;

  IF v_pa_id IS NULL OR v_created IS NULL THEN
    SELECT pa_id, created_at INTO v_pa_id, v_created
      FROM public.sicoob_orders WHERE id = p_order_id;
  END IF;

  IF v_pa_id IS NULL OR v_created IS NULL THEN
    RAISE EXCEPTION 'Pedido % inexistente ou sem PA.', p_order_id;
  END IF;

  SELECT id INTO v_budget_id
    FROM public.pa_budgets
   WHERE pa_id = v_pa_id
     AND ano = EXTRACT(YEAR FROM v_created)::INT
     AND mes = EXTRACT(MONTH FROM v_created)::INT
   LIMIT 1;
  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'Pedido % não possui verba configurada para a competência.', p_order_id;
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id FOR UPDATE;
  IF v_budget.fechada_em IS NOT NULL THEN
    RAISE EXCEPTION 'Competência %/% fechada; não é possível movimentar verba.',
      v_budget.mes, v_budget.ano;
  END IF;

  v_total := COALESCE(p_total, 0);
  v_cc := p_cost_center_id;

  -- Posição atual do pedido: saldo líquido do livro e o estado que o ocupa.
  -- `created_at` é constante dentro da transação e `id` é UUID aleatório, então
  -- "pegar o último evento" não é determinístico quando a transição grava
  -- liberação e nova posição juntas. O estado vigente é o único com saldo
  -- não zerado — cada evento muda um estado e a transição zera o anterior.
  SELECT COALESCE(sum(valor), 0) INTO v_atual_valor
    FROM public.pa_budget_entries
   WHERE order_id = p_order_id AND pa_budget_id = v_budget_id;

  SELECT estado INTO v_atual
    FROM (
      SELECT estado, sum(valor) AS saldo
        FROM public.pa_budget_entries
       WHERE order_id = p_order_id AND pa_budget_id = v_budget_id
       GROUP BY estado
      HAVING sum(valor) <> 0
    ) AS posicao
   ORDER BY abs(posicao.saldo) DESC, posicao.estado
   LIMIT 1;

  -- Livro líquido zerado significa pedido fora do ciclo.
  IF COALESCE(v_atual_valor, 0) = 0 THEN
    v_atual := NULL;
  END IF;

  -- Idempotência: mesma posição e mesmo valor não gera evento.
  IF v_atual IS NOT DISTINCT FROM NULLIF(p_para_estado, 'liberado')
     AND COALESCE(v_atual_valor, 0) = (CASE WHEN p_para_estado = 'liberado' THEN 0 ELSE v_total END) THEN
    RETURN v_budget;
  END IF;

  -- Consumo legado com cap: o backfill limitou o lançamento ao histórico
  -- registrado, então o livro pode guardar menos que `total_amount`. Concluir
  -- um pedido já entregue não é gasto novo, e o gatilho bloqueia mudança de
  -- valor em pedido consumido: posição e destino iguais não movimentam nada,
  -- mesmo com valores diferentes. Sem isto, `delivered` -> `completed`
  -- estornava a posição parcial e relançava o total como consumo novo.
  IF p_para_estado = 'consumido' AND v_atual = 'consumido' THEN
    RETURN v_budget;
  END IF;

  -- Pedido legado ja entregue que o backfill nao conseguiu lancar: o consumo
  -- historico do agregado acabou antes do fim da fila, entao este pedido ficou
  -- com livro liquido zero. Ele ja esta contado em `verba_consumida` desde o
  -- backfill; concluir (`delivered` -> `completed`) nao e gasto novo e nao
  -- pode exigir saldo livre nem inflar o consumo outra vez.
  IF p_para_estado = 'consumido'
     AND COALESCE(v_atual_valor, 0) = 0
     AND EXISTS (
       SELECT 1 FROM public.sicoob_orders o
        WHERE o.id = p_order_id
          AND o.status IN ('delivered', 'completed')
     ) THEN
    RETURN v_budget;
  END IF;

  -- Entrar no ciclo (ou consumir direto) exige saldo livre na competência.
  -- A posição atual é liberada no mesmo movimento, então ela volta ao saldo.
  IF p_para_estado <> 'liberado' THEN
    v_pendente := v_budget.verba_planejada
                  - v_budget.verba_reservada
                  - v_budget.verba_comprometida
                  - v_budget.verba_consumida
                  + COALESCE(v_atual_valor, 0);
    IF v_total > v_pendente THEN
      RAISE EXCEPTION
        'Saldo insuficiente na competência %/%: disponível %, solicitado %.',
        v_budget.mes, v_budget.ano, v_pendente, v_total;
    END IF;
  END IF;

  -- Fecha a posição anterior devolvendo exatamente o que ela ocupava. Cada
  -- centro de custo recebe o estorno da sua própria parcela: um unico
  -- lancamento com o valor total deixaria o rateio sem reflexo no livro.
  IF v_atual IS NOT NULL AND COALESCE(v_atual_valor, 0) <> 0 THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    SELECT v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes, e.cost_center_id,
           CASE WHEN v_atual = 'reservado' THEN 'liberacao' ELSE 'estorno' END,
           v_atual, -sum(e.valor), p_order_id,
           COALESCE(p_motivo, 'Transição de ' || v_atual || ' para ' || p_para_estado),
           (SELECT auth.uid())
      FROM public.pa_budget_entries e
     WHERE e.order_id = p_order_id
       AND e.pa_budget_id = v_budget_id
       AND e.estado = v_atual
     GROUP BY e.cost_center_id
    HAVING sum(e.valor) <> 0;
  END IF;

  -- Abre a nova posição respeitando o rateio por centro de custo. Sem rateio
  -- (ou com rateio que nao fecha o total do pedido) o pedido inteiro vai para
  -- o centro herdado. Sem esta divisao o rateio existiria so na tela: o livro
  -- continuaria debitando tudo em um unico centro.
  IF p_para_estado <> 'liberado' AND v_total <> 0 THEN
    INSERT INTO public.pa_budget_entries
      (pa_budget_id, pa_id, competencia_ano, competencia_mes, cost_center_id,
       tipo, estado, valor, order_id, motivo, actor_id)
    SELECT v_budget_id, v_budget.pa_id, v_budget.ano, v_budget.mes,
           COALESCE(a.cost_center_id, v_cc),
           CASE p_para_estado WHEN 'reservado' THEN 'reserva'
                              WHEN 'comprometido' THEN 'compromisso'
                              ELSE 'consumo' END,
           p_para_estado, a.valor, p_order_id, p_motivo, (SELECT auth.uid())
      FROM (
        SELECT rateio.cost_center_id, rateio.valor
          FROM public.pa_budget_allocations AS rateio
         WHERE rateio.order_id = p_order_id
         UNION ALL
        -- Pedido sem rateio continua lancando o valor inteiro no centro
        -- herdado (pode ser nulo, como antes da divisao por centro).
        SELECT v_cc, v_total
         WHERE NOT EXISTS (
           SELECT 1 FROM public.pa_budget_allocations AS r2
            WHERE r2.order_id = p_order_id
         )
      ) AS a
     WHERE a.valor <> 0;
  END IF;

  SELECT * INTO v_budget FROM public.pa_budgets WHERE id = v_budget_id;
  RETURN v_budget;
END;
$function$
