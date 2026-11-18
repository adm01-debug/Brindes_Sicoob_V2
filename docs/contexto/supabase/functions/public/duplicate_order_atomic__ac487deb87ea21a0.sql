CREATE OR REPLACE FUNCTION public.duplicate_order_atomic(p_order_id uuid, p_idempotency_key uuid)
 RETURNS SETOF orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_source public.orders%ROWTYPE;
  v_created public.orders%ROWTYPE;
  v_existing_order_id uuid;
  v_item_count integer;
  v_subtotal numeric;
  v_discount numeric;
  v_shipping numeric;
  v_total numeric;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Autenticação obrigatória.';
  END IF;
  IF p_order_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'Pedido e chave de idempotência são obrigatórios.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor::text || ':' || p_order_id::text || ':' || p_idempotency_key::text,
    0
  ));

  SELECT r.duplicated_order_id
    INTO v_existing_order_id
    FROM public.order_duplicate_requests r
   WHERE r.actor_id = v_actor
     AND r.source_order_id = p_order_id
     AND r.idempotency_key = p_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN QUERY SELECT o.* FROM public.orders o WHERE o.id = v_existing_order_id;
    RETURN;
  END IF;

  SELECT o.*
    INTO v_source
    FROM public.orders o
   WHERE o.id = p_order_id
     AND (
       o.seller_id = v_actor
       OR public.can_view_all_sales(v_actor)
       OR (
         public.has_role(v_actor, 'supervisor'::public.app_role)
         AND (o.organization_id IS NULL OR o.organization_id IN (
           SELECT public.get_user_org_ids(v_actor)
         ))
       )
     )
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pedido inexistente ou sem acesso.';
  END IF;

  SELECT count(*)::integer,
         round(COALESCE(sum(oi.quantity * oi.unit_price), 0), 2)
    INTO v_item_count, v_subtotal
    FROM public.order_items oi
   WHERE oi.order_id = p_order_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido de origem não possui itens.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
     WHERE oi.order_id = p_order_id
       AND (oi.quantity IS NULL OR oi.quantity <= 0 OR oi.unit_price IS NULL OR oi.unit_price < 0)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido de origem possui item com quantidade ou preço inválido.';
  END IF;

  v_discount := round(COALESCE(v_source.discount_amount, 0), 2);
  v_shipping := round(COALESCE(v_source.shipping_cost, 0), 2);
  IF v_discount < 0 OR v_discount > v_subtotal OR v_shipping < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Desconto ou frete inválido no pedido de origem.';
  END IF;
  v_total := round(v_subtotal - v_discount + v_shipping, 2);

  INSERT INTO public.orders (
    seller_id, order_number, status, fulfillment_status,
    client_id, client_name, client_email, client_phone, client_company,
    quote_id, subtotal, discount_amount, shipping_cost, total,
    notes, internal_notes, shipping_type, payment_terms, delivery_time,
    organization_id, version
  ) VALUES (
    v_actor,
    'RE-' || regexp_replace(v_source.order_number, '[^[:alnum:]-]', '', 'g')
      || '-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    'rascunho', 'unfulfilled',
    v_source.client_id, v_source.client_name, v_source.client_email,
    v_source.client_phone, v_source.client_company, v_source.quote_id,
    v_subtotal, v_discount, v_shipping, v_total,
    v_source.notes, v_source.internal_notes, v_source.shipping_type,
    v_source.payment_terms, v_source.delivery_time,
    v_source.organization_id, 1
  )
  RETURNING * INTO v_created;

  INSERT INTO public.order_items (
    order_id, product_id, product_sku, product_name, product_image_url,
    quantity, unit_price, organization_id
  )
  SELECT v_created.id, oi.product_id, oi.product_sku, oi.product_name,
         oi.product_image_url, oi.quantity, oi.unit_price, v_source.organization_id
    FROM public.order_items oi
   WHERE oi.order_id = p_order_id
   ORDER BY oi.created_at, oi.id;

  INSERT INTO public.order_logistics (
    order_id, carrier_name, delivery_status, notes
  )
  SELECT v_created.id, ol.carrier_name, 'pending', ol.notes
    FROM public.order_logistics ol
   WHERE ol.order_id = p_order_id
   ORDER BY ol.created_at, ol.id;

  SELECT COALESCE(p.full_name, p.email, 'Usuário'), p.role
    INTO v_actor_name, v_actor_role
    FROM public.profiles p
   WHERE p.user_id = v_actor
   LIMIT 1;

  INSERT INTO public.order_audit_events (
    order_id, event_type, event_category, actor_id, actor_name, actor_role,
    description, metadata, created_by_name, category
  ) VALUES (
    v_created.id, 'ORDER_DUPLICATED', 'system', v_actor,
    COALESCE(v_actor_name, 'Usuário'), v_actor_role,
    format('Pedido duplicado a partir do pedido #%s', v_source.order_number),
    jsonb_build_object(
      'original_order_id', p_order_id,
      'idempotency_key', p_idempotency_key,
      'recalculated_subtotal', v_subtotal,
      'recalculated_total', v_total
    ),
    COALESCE(v_actor_name, 'Usuário'), 'system'
  );

  INSERT INTO public.order_duplicate_requests (
    actor_id, source_order_id, idempotency_key, duplicated_order_id
  ) VALUES (
    v_actor, p_order_id, p_idempotency_key, v_created.id
  );

  RETURN NEXT v_created;
  RETURN;
END;
$function$
