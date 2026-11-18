CREATE OR REPLACE FUNCTION public.record_sicoob_delivery_receipt(p_allocation_id uuid, p_idempotency_key uuid, p_received_quantity integer DEFAULT 0, p_damaged_quantity integer DEFAULT 0, p_missing_quantity integer DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_allocation public.sicoob_delivery_allocations%ROWTYPE;
  v_group public.order_consolidations%ROWTYPE;
  v_event_id uuid;
  v_has_issues boolean;
  v_all_complete boolean;
  v_destination_pa_id uuid;
  v_existing_event public.sicoob_delivery_receipt_events%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_received_quantity < 0 OR p_damaged_quantity < 0 OR p_missing_quantity < 0
     OR p_received_quantity + p_damaged_quantity + p_missing_quantity <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe ao menos uma quantidade positiva.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sicoob-delivery-receipt:' || p_idempotency_key::text, 0));
  SELECT * INTO v_existing_event
    FROM public.sicoob_delivery_receipt_events
   WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_event.allocation_id IS DISTINCT FROM p_allocation_id
       OR v_existing_event.received_quantity IS DISTINCT FROM p_received_quantity
       OR v_existing_event.damaged_quantity IS DISTINCT FROM p_damaged_quantity
       OR v_existing_event.missing_quantity IS DISTINCT FROM p_missing_quantity
       OR v_existing_event.notes IS DISTINCT FROM NULLIF(trim(p_notes), '')
       OR v_existing_event.received_by IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com outro recebimento.';
    END IF;
    RETURN v_existing_event.id;
  END IF;
  IF p_damaged_quantity + p_missing_quantity > 0
     AND length(trim(COALESCE(p_notes, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Descreva a divergência com ao menos 10 caracteres.';
  END IF;

  SELECT a.* INTO v_allocation
  FROM public.sicoob_delivery_allocations a WHERE a.id = p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Alocação não encontrada.'; END IF;
  SELECT c.* INTO v_group
  FROM public.sicoob_delivery_destinations d
  JOIN public.order_consolidations c ON c.id = d.consolidation_id
  WHERE d.id = v_allocation.destination_id FOR UPDATE OF c;
  SELECT pa_id INTO v_destination_pa_id
  FROM public.sicoob_delivery_destinations WHERE id = v_allocation.destination_id;
  IF v_group.status NOT IN ('sent', 'partially_received') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Recebimento permitido somente após o despacho.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE (p.user_id = v_actor_id OR p.id = v_actor_id)
         AND p.pa_id = v_destination_pa_id
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM public.user_roles ur
           WHERE ur.user_id = v_actor_id AND ur.role::text IN ('gerente_pa', 'comprador_pac')
         )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF v_allocation.received_quantity + v_allocation.damaged_quantity + v_allocation.missing_quantity
     + p_received_quantity + p_damaged_quantity + p_missing_quantity > v_allocation.quantity THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O recebimento supera a quantidade destinada.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'receive', true);
  INSERT INTO public.sicoob_delivery_receipt_events (
    idempotency_key, allocation_id, received_quantity, damaged_quantity, missing_quantity, notes, received_by
  ) VALUES (
    p_idempotency_key, p_allocation_id, p_received_quantity, p_damaged_quantity, p_missing_quantity,
    NULLIF(trim(p_notes), ''), v_actor_id
  ) RETURNING id INTO v_event_id;
  UPDATE public.sicoob_delivery_allocations SET
    received_quantity = received_quantity + p_received_quantity,
    damaged_quantity = damaged_quantity + p_damaged_quantity,
    missing_quantity = missing_quantity + p_missing_quantity,
    updated_at = now()
  WHERE id = p_allocation_id;

  SELECT bool_and(a.received_quantity + a.damaged_quantity + a.missing_quantity = a.quantity),
         bool_or(a.damaged_quantity > 0 OR a.missing_quantity > 0)
    INTO v_all_complete, v_has_issues
    FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
   WHERE d.consolidation_id = v_group.id;
  UPDATE public.order_consolidations SET
    status = CASE
      WHEN v_all_complete AND v_has_issues THEN 'received_with_issues'
      WHEN v_all_complete THEN 'received'
      ELSE 'partially_received'
    END,
    received_at = CASE WHEN v_all_complete THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_group.id;
  -- Quantidades avariadas ou faltantes encerram a conferência física do lote,
  -- mas não caracterizam entrega concluída. O pedido permanece em logística
  -- até que a divergência seja resolvida pelo fluxo operacional.
  IF v_all_complete AND NOT v_has_issues THEN
    PERFORM set_config('app.sicoob_order_status_comment', 'Recebimento integral do lote consolidado ' || v_group.id::text || '.', true);
    UPDATE public.sicoob_orders o
       SET status = 'completed', updated_at = now()
      FROM public.order_consolidation_orders co
     WHERE co.consolidation_id = v_group.id
       AND co.order_id = o.id
       AND o.status = 'logistic';
    IF NOT FOUND OR EXISTS (
      SELECT 1
        FROM public.order_consolidation_orders co
        JOIN public.sicoob_orders o ON o.id = co.order_id
       WHERE co.consolidation_id = v_group.id
         AND o.status <> 'completed'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
    END IF;
  END IF;
  RETURN v_event_id;
END;
$function$
