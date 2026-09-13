-- Follow-up de 20260912190000_sicoob_consolidation_distribution.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


CREATE OR REPLACE FUNCTION public.allocate_sicoob_consolidation_by_order_pa(p_consolidation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
  v_count integer;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Consolidação não encontrada.'; END IF;
  IF v_group.status NOT IN ('draft', 'pending_seller') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Distribuição já despachada e não pode ser refeita.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    WHERE co.consolidation_id = p_consolidation_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A consolidação não possui itens para distribuir.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
      LEFT JOIN public.postos_atendimento pa ON pa.id = o.pa_id
     WHERE co.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam estar ativos e com endereço completo.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'allocate', true);
  DELETE FROM public.sicoob_delivery_allocations a USING public.sicoob_delivery_destinations d
   WHERE a.destination_id = d.id AND d.consolidation_id = p_consolidation_id;
  DELETE FROM public.sicoob_delivery_destinations WHERE consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_destinations (
    consolidation_id, pa_id, destination_name, address_snapshot
  )
  SELECT DISTINCT p_consolidation_id, pa.id, pa.nome,
    jsonb_build_object('codigo', pa.codigo, 'endereco', pa.endereco, 'cidade', pa.cidade, 'uf', pa.uf)
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.postos_atendimento pa ON pa.id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_allocations (destination_id, order_item_id, quantity)
  SELECT d.id, oi.id, oi.quantity
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.sicoob_order_items oi ON oi.order_id = o.id
  JOIN public.sicoob_delivery_destinations d
    ON d.consolidation_id = p_consolidation_id AND d.pa_id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.dispatch_sicoob_order_consolidation(p_consolidation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND OR v_group.status <> 'pending_seller' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A consolidação mudou; atualize a página.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_delivery_destinations d
      LEFT JOIN public.postos_atendimento pa ON pa.id = d.pa_id
     WHERE d.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam permanecer ativos e com endereço completo antes do despacho.';
  END IF;
  IF EXISTS (
    SELECT oi.id
    FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    LEFT JOIN (
      SELECT a.order_item_id, sum(a.quantity) AS allocated_quantity
      FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
      WHERE d.consolidation_id = p_consolidation_id
      GROUP BY a.order_item_id
    ) allocated ON allocated.order_item_id = oi.id
    WHERE co.consolidation_id = p_consolidation_id
      AND COALESCE(allocated.allocated_quantity, 0) <> oi.quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os itens precisam de um destino antes do despacho.';
  END IF;
  PERFORM set_config('app.sicoob_consolidation_operation', 'dispatch', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Despachado no lote consolidado ' || p_consolidation_id::text || '.', true);
  UPDATE public.sicoob_orders o
     SET status = 'logistic', updated_at = now()
    FROM public.order_consolidation_orders co
   WHERE co.consolidation_id = p_consolidation_id
     AND co.order_id = o.id
     AND o.status = 'confirmed';
  IF NOT FOUND OR EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
     WHERE co.consolidation_id = p_consolidation_id
       AND o.status <> 'logistic'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
  END IF;
  UPDATE public.order_consolidations SET status = 'sent', updated_at = now()
   WHERE id = p_consolidation_id;
END;
$$;
