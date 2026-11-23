CREATE OR REPLACE FUNCTION public.pa_budget_reconcile(p_pa_id uuid, p_ano integer, p_mes integer)
 RETURNS TABLE(pa_budget_id uuid, planejado numeric, reservado_agregado numeric, reservado_livro numeric, comprometido_agregado numeric, comprometido_livro numeric, consumido_agregado numeric, consumido_livro numeric, divergente boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.user_can_access_pa(p_pa_id) THEN
    RAISE EXCEPTION 'Sem permissao para conciliar a verba do PA %.', p_pa_id;
  END IF;

  RETURN QUERY
  SELECT b.id,
         b.verba_planejada,
         b.verba_reservada,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'reservado'), 0),
         b.verba_comprometida,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'comprometido'), 0),
         b.verba_consumida,
         COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                    WHERE e.pa_budget_id = b.id AND e.estado = 'consumido'), 0),
         (b.verba_reservada <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                           WHERE e.pa_budget_id = b.id AND e.estado = 'reservado'), 0)
          OR b.verba_comprometida <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                                 WHERE e.pa_budget_id = b.id AND e.estado = 'comprometido'), 0)
          OR b.verba_consumida <> COALESCE((SELECT sum(e.valor) FROM public.pa_budget_entries e
                                              WHERE e.pa_budget_id = b.id AND e.estado = 'consumido'), 0))
    FROM public.pa_budgets b
   WHERE b.pa_id = p_pa_id AND b.ano = p_ano AND b.mes = p_mes;
END;
$function$
