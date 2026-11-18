CREATE OR REPLACE FUNCTION public.allocate_sicoob_consolidation_by_order_pa(p_consolidation_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         OR NULLIF(trim(pa.nome), '') IS NULL
         OR NULLIF(trim(pa.codigo), '') IS NULL
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam estar ativos, identificados e com endereço completo.';
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
$function$
