CREATE OR REPLACE FUNCTION public.refresh_sicoob_reorder_quote(p_quote_id uuid, p_items jsonb, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_item jsonb;
  v_source_item_id uuid;
  v_target_item public.quote_items%ROWTYPE;
  v_personalization jsonb;
  v_total numeric(14,2) := 0;
  v_sort_order integer := 0;
  v_valid_until timestamptz;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);
  SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR (v_quote.reorder_source_order_id IS NULL AND v_quote.reorder_source_quote_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento de recompra não encontrado.';
  END IF;
  IF v_quote.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A recompra não pode mais ser revalidada neste estado.';
  END IF;
  IF v_quote.seller_id IS DISTINCT FROM p_actor_id
     AND NOT public.can_manage_quote_scope(p_actor_id, p_quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revalidar esta recompra.';
  END IF;
  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.quote_items WHERE quote_id = p_quote_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de itens mudou; crie uma nova recompra.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_source_item_id := (v_item ->> 'source_order_item_id')::uuid;
    IF v_quote.reorder_source_order_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.sicoob_order_items source_item
        WHERE source_item.id = v_source_item_id
          AND source_item.order_id = v_quote.reorder_source_order_id
          AND source_item.product_id::text = v_item ->> 'product_id'
          AND source_item.quantity = (v_item ->> 'quantity')::integer
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item divergente do pedido de origem.';
      END IF;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.quote_items source_item
        WHERE source_item.id = v_source_item_id
          AND source_item.quote_id = v_quote.reorder_source_quote_id
          AND source_item.product_id = v_item ->> 'product_id'
          AND source_item.quantity = (v_item ->> 'quantity')::integer
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item divergente do orçamento de origem.';
      END IF;
    END IF;

    SELECT * INTO v_target_item FROM public.quote_items qi
    WHERE qi.quote_id = p_quote_id AND COALESCE(qi.sort_order, 0) = v_sort_order
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de destino não encontrado.';
    END IF;

    UPDATE public.quote_items qi
    SET product_id = v_item ->> 'product_id',
        product_name = v_item ->> 'product_name',
        product_sku = NULLIF(v_item ->> 'product_sku', ''),
        product_image_url = NULLIF(v_item ->> 'product_image_url', ''),
        quantity = (v_item ->> 'quantity')::integer,
        unit_price = (v_item ->> 'unit_price')::numeric,
        color_name = NULLIF(v_item ->> 'color_name', ''),
        color_hex = NULLIF(v_item ->> 'color_hex', ''),
        size_code = NULLIF(v_item ->> 'size_code', ''),
        source_variant_id = NULLIF(v_item ->> 'source_variant_id', ''),
        source_variant_sku = NULLIF(v_item ->> 'source_variant_sku', ''),
        catalog_checked_at = (v_item ->> 'catalog_checked_at')::timestamptz,
        catalog_available_stock = (v_item ->> 'available_stock')::integer,
        catalog_minimum_quantity = (v_item ->> 'minimum_quantity')::integer,
        catalog_valid_until = (v_item ->> 'catalog_valid_until')::timestamptz,
        historical_unit_price = NULLIF(v_item ->> 'historical_unit_price', '')::numeric,
        price_changed = COALESCE((v_item ->> 'price_changed')::boolean, false),
        catalog_stock_is_reserved = false,
        updated_at = statement_timestamp()
    WHERE qi.id = v_target_item.id;

    DELETE FROM public.quote_item_personalizations WHERE quote_item_id = v_target_item.id;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, width_cm, height_cm,
        personalized_quantity, unit_cost, setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_target_item.id, v_personalization ->> 'technique_id', v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        'Arte histórica copiada como referência; exige nova validação de marca.',
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
      v_total := v_total + (v_personalization ->> 'total_cost')::numeric;
    END LOOP;
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes q
  SET subtotal = v_total,
      total = v_total,
      catalog_revalidated_at = statement_timestamp(),
      catalog_valid_until = v_valid_until,
      catalog_stock_is_reserved = false,
      reorder_price_changed_items = (
        SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
        WHERE COALESCE((item ->> 'price_changed')::boolean, false)
      ),
      row_version = q.row_version + 1,
      updated_at = statement_timestamp()
  WHERE q.id = p_quote_id;

  INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
  VALUES (
    p_quote_id, p_actor_id, 'updated', 'Preço, mínimo e estoque reconsultados para a recompra.',
    jsonb_build_object(
      'catalog_valid_until', v_valid_until,
      'price_changed_items', (
        SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
        WHERE COALESCE((item ->> 'price_changed')::boolean, false)
      ),
      'stock_is_reserved', false
    )
  );
  RETURN p_quote_id;
END;
$function$
