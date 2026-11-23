CREATE OR REPLACE FUNCTION public.pa_budget_validate_allocations(p_order_id uuid, p_total numeric, p_status text, p_estrito boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_soma NUMERIC(14,2);
  v_perc NUMERIC(5,2);
  v_tolerancia NUMERIC(14,2);
BEGIN
  SELECT COALESCE(sum(valor), 0), COALESCE(sum(percentual), 0)
    INTO v_soma, v_perc
    FROM public.pa_budget_allocations WHERE order_id = p_order_id;

  IF COALESCE(v_soma, 0) = 0 THEN
    RETURN;
  END IF;

  -- O rateio e montado linha a linha enquanto o pedido esta em construcao;
  -- cada linha chega em uma transacao propria, entao exigir a soma fechada a
  -- cada INSERT travaria a propria tela de rateio. A soma de 100% e exigida
  -- quando o pedido entra ou muda de posicao na verba (`p_estrito`).
  IF NOT p_estrito
     AND p_status IN ('rascunho', 'draft', 'pending', 'waiting_approval',
                      'escalated_to_board', 'rejected', 'cancelled') THEN
    RETURN;
  END IF;

  -- Tolerancia zero no caminho estrito: R$ 0,01 de sobra deixava a verba
  -- consumida divergir do pedido centavo a centavo, e o erro so aparecia
  -- meses depois na conciliacao.
  v_tolerancia := CASE WHEN p_estrito THEN 0 ELSE 0.01 END;

  IF abs(v_soma - COALESCE(p_total, 0)) > v_tolerancia THEN
    RAISE EXCEPTION 'Rateio do pedido % soma %, mas o pedido vale %.',
      p_order_id, v_soma, p_total;
  END IF;

  IF abs(v_perc - 100) > v_tolerancia THEN
    RAISE EXCEPTION 'Rateio do pedido % esta em % por cento; precisa fechar em 100.',
      p_order_id, v_perc;
  END IF;
END;
$function$
