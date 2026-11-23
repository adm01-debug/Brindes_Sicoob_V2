CREATE OR REPLACE FUNCTION public.pa_budget_replace_allocations(p_order_id uuid, p_rows jsonb DEFAULT '[]'::jsonb)
 RETURNS SETOF pa_budget_allocations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
  v_total NUMERIC(14,2);
  v_centro UUID;
  v_pa_id UUID;
  v_created TIMESTAMPTZ;
  v_duplicados INT;
  v_centro_alheio UUID;
  v_estado TEXT;
BEGIN
  -- "nao existe" e "sem permissao" respondem igual para nao virar oraculo de
  -- existencia de pedido privado a partir do identificador. A prova de escopo
  -- vem ANTES do FOR UPDATE: bloquear a linha privada de outro escopo revela
  -- que ela existe pelo tempo de espera do lock.
  -- Ler o pedido nao da autoridade sobre a verba: o criador e o aprovador
  -- delegado alcancam o pedido, mas quem reposiciona os debitos no livro e
  -- quem gere verba. A checagem vem antes do FOR UPDATE pelo mesmo motivo da
  -- prova de escopo (o tempo de espera do lock denuncia a linha privada).
  IF NOT public.pa_budget_allocation_write_ok(p_order_id) THEN
    RAISE EXCEPTION 'Pedido % nao encontrado ou sem permissao para ratear.', p_order_id;
  END IF;

  -- FOR UPDATE serializa salvamentos concorrentes do mesmo pedido. Sem o
  -- bloqueio, dois salvamentos leem o mesmo conjunto, cada DELETE so alcanca
  -- as linhas visiveis no inicio do seu comando e as duas insercoes passam
  -- pela unicidade quando os centros diferem: o pedido fica rateado em 200%.
  SELECT COALESCE(total_amount, 0), status, cost_center_id, pa_id, created_at
    INTO v_total, v_status, v_centro, v_pa_id, v_created
    FROM public.sicoob_orders WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % nao encontrado ou sem permissao para ratear.', p_order_id;
  END IF;

  SELECT count(*) - count(DISTINCT row_data->>'cost_center_id')
    INTO v_duplicados
    FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS row_data;

  IF COALESCE(v_duplicados, 0) > 0 THEN
    RAISE EXCEPTION 'Cada centro de custo pode aparecer uma unica vez no rateio.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS row_data
     WHERE (row_data->>'cost_center_id') IS NULL
        OR (row_data->>'valor') IS NULL
  ) THEN
    RAISE EXCEPTION 'Cada linha do rateio precisa de centro de custo e valor.';
  END IF;

  -- A funcao roda como proprietaria e nao passa pela policy de INSERT; o
  -- vinculo centro de custo x cooperativa do pedido precisa ser provado aqui,
  -- senao o rateio aceita centro de outra cooperativa.
  -- A cooperativa de referencia e a ATUAL do PA (nao a gravada no pedido): um
  -- PA transferido entre Singulares mantem pedidos antigos com a cooperativa de
  -- origem, e o rateio tem que acompanhar o posto.
  SELECT (row_data->>'cost_center_id')::uuid
    INTO v_centro_alheio
    FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS row_data
    LEFT JOIN public.cost_centers AS center
           ON center.id = (row_data->>'cost_center_id')::uuid
    LEFT JOIN public.sicoob_orders AS ord ON ord.id = p_order_id
    LEFT JOIN public.postos_atendimento AS service_point ON service_point.id = ord.pa_id
   WHERE center.id IS NULL
      OR service_point.cooperativa_id IS DISTINCT FROM center.cooperativa_id
   LIMIT 1;

  IF v_centro_alheio IS NOT NULL THEN
    RAISE EXCEPTION 'Centro de custo % nao pertence a cooperativa do pedido.', v_centro_alheio;
  END IF;

  DELETE FROM public.pa_budget_allocations WHERE order_id = p_order_id;

  IF jsonb_array_length(COALESCE(p_rows, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.pa_budget_allocations (order_id, cost_center_id, valor, percentual)
    SELECT p_order_id,
           (row_data->>'cost_center_id')::uuid,
           (row_data->>'valor')::numeric,
           (row_data->>'percentual')::numeric
      FROM jsonb_array_elements(p_rows) AS row_data;
  END IF;

  PERFORM public.pa_budget_validate_allocations(p_order_id, v_total, v_status);

  -- Pedido já dentro do ciclo: o rateio vive no livro de verba, não só nesta
  -- tabela. Sem reemitir a posição, salvar rateio novo deixaria o livro
  -- debitando os centros antigos. Liberar e reaplicar o mesmo estado gera o
  -- estorno por centro e a nova posição pelo rateio atual, sem mexer no saldo
  -- total do pedido.
  v_estado := public.pa_budget_estado_do_status(v_status);
  IF v_estado <> 'liberado' THEN
    PERFORM public.pa_budget_apply_state(
      p_order_id, v_total, v_centro, 'liberado',
      'Rateio do pedido atualizado', v_pa_id, v_created);
    PERFORM public.pa_budget_apply_state(
      p_order_id, v_total, v_centro, v_estado,
      'Rateio do pedido atualizado', v_pa_id, v_created);
  END IF;

  RETURN QUERY
    SELECT * FROM public.pa_budget_allocations
     WHERE order_id = p_order_id
     ORDER BY created_at, id;
END;
$function$
