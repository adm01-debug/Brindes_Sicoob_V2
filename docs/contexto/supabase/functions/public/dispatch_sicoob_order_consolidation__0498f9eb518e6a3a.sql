CREATE OR REPLACE FUNCTION public.dispatch_sicoob_order_consolidation(p_consolidation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         OR NULLIF(trim(pa.nome), '') IS NULL
         OR NULLIF(trim(pa.codigo), '') IS NULL
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
         OR d.destination_name IS DISTINCT FROM pa.nome
         OR d.address_snapshot ->> 'codigo' IS DISTINCT FROM pa.codigo
         OR d.address_snapshot ->> 'endereco' IS DISTINCT FROM pa.endereco
         OR d.address_snapshot ->> 'cidade' IS DISTINCT FROM pa.cidade
         OR d.address_snapshot ->> 'uf' IS DISTINCT FROM pa.uf
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Um destino mudou, está inativo ou incompleto; atualize a distribuição antes do despacho.';
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
$function$
