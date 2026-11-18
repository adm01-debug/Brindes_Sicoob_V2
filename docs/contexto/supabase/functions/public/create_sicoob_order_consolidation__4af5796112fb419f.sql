CREATE OR REPLACE FUNCTION public.create_sicoob_order_consolidation(p_order_ids uuid[], p_seller_id uuid, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
