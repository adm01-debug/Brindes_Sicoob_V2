-- Fecha corridas de idempotência e impede despacho com endereço diferente
-- daquele fotografado na distribuição do lote.

CREATE INDEX IF NOT EXISTS idx_order_consolidations_singular_id
  ON public.order_consolidations(singular_id);
CREATE INDEX IF NOT EXISTS idx_order_consolidations_vendedor_id
  ON public.order_consolidations(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_delivery_destinations_pa_id
  ON public.sicoob_delivery_destinations(pa_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_delivery_allocations_order_item_id
  ON public.sicoob_delivery_allocations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_delivery_receipts_received_by
  ON public.sicoob_delivery_receipt_events(received_by);

ALTER TABLE public.order_consolidations
  VALIDATE CONSTRAINT order_consolidations_singular_id_fkey;
ALTER TABLE public.order_consolidations
  VALIDATE CONSTRAINT order_consolidations_vendedor_id_fkey;

CREATE OR REPLACE FUNCTION public.create_sicoob_order_consolidation(
  p_order_ids uuid[],
  p_seller_id uuid,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_consolidation_id uuid;
  v_existing_group public.order_consolidations%ROWTYPE;
  v_cooperative_id uuid;
  v_count integer;
  v_total numeric;
BEGIN
  IF v_actor_id IS NULL
     OR p_idempotency_key IS NULL
     OR p_seller_id IS NULL
     OR p_order_ids IS NULL
     OR cardinality(p_order_ids) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Pedidos, vendedor e chave de idempotência são obrigatórios.';
  END IF;
  IF cardinality(p_order_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_order_ids) id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A lista de pedidos contém duplicidades ou valor nulo.';
  END IF;

  -- Serializa a intenção antes de consultar a chave. Assim, uma repetição que
  -- chegou enquanto a primeira transação ainda gravava o lote relê o resultado
  -- confirmado, em vez de falhar por pedido já vinculado ou índice único.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('sicoob-order-consolidation:' || p_idempotency_key::text, 0)
  );

  SELECT * INTO v_existing_group
    FROM public.order_consolidations WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_group.consolidated_by IS DISTINCT FROM v_actor_id
       OR v_existing_group.vendedor_id IS DISTINCT FROM p_seller_id
       OR (SELECT count(*) FROM public.order_consolidation_orders co
            WHERE co.consolidation_id = v_existing_group.id) <> cardinality(p_order_ids)
       OR EXISTS (
         SELECT 1 FROM public.order_consolidation_orders co
          WHERE co.consolidation_id = v_existing_group.id
            AND NOT (co.order_id = ANY(p_order_ids))
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'A chave de idempotência já foi usada por outro usuário ou conteúdo.';
    END IF;
    RETURN v_existing_group.id;
  END IF;

  PERFORM 1 FROM public.sicoob_orders WHERE id = ANY(p_order_ids) FOR UPDATE;
  SELECT cooperative_id INTO v_cooperative_id
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
   LIMIT 1;
  SELECT count(*), sum(total_amount)
    INTO v_count, v_total
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
     AND cooperative_id IS NOT NULL
     AND pa_id IS NOT NULL
     AND total_amount IS NOT NULL
     AND total_amount >= 0
     AND status = 'confirmed'
     AND consolidation_id IS NULL;
  IF v_count <> cardinality(p_order_ids)
     OR EXISTS (
       SELECT 1 FROM public.sicoob_orders
        WHERE id = ANY(p_order_ids) AND cooperative_id IS DISTINCT FROM v_cooperative_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedidos precisam estar confirmados, livres, com total válido e na mesma Singular.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_seller_id OR p.id = p_seller_id)
      AND p.cooperativa_id = v_cooperative_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_seller_id AND ur.role::text = 'vendedor'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Vendedor informado não possui vínculo ativo nesta Singular.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'create', true);
  INSERT INTO public.order_consolidations (
    singular_id, vendedor_id, status, total_value, order_count, consolidated_by, idempotency_key
  ) VALUES (
    v_cooperative_id, p_seller_id, 'pending_seller', v_total, v_count, v_actor_id, p_idempotency_key
  ) RETURNING id INTO v_consolidation_id;

  INSERT INTO public.order_consolidation_orders (consolidation_id, order_id, order_total_snapshot)
  SELECT v_consolidation_id, id, total_amount
    FROM public.sicoob_orders WHERE id = ANY(p_order_ids);
  UPDATE public.sicoob_orders SET consolidation_id = v_consolidation_id
   WHERE id = ANY(p_order_ids);
  PERFORM public.allocate_sicoob_consolidation_by_order_pa(v_consolidation_id);
  RETURN v_consolidation_id;
END;
$$;

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
$$;

REVOKE ALL ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) TO authenticated;
