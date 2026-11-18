CREATE OR REPLACE FUNCTION public.reorder_sicoob_quote_as_quote(p_quote_id uuid, p_items jsonb, p_idempotency_key text, p_actor_id uuid, p_request_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_source public.quotes%ROWTYPE;
  v_existing public.sicoob_quote_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_source_item public.quote_items%ROWTYPE;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_personalization jsonb;
  v_total numeric(14,2) := 0;
  v_sort_order integer := 0;
  v_valid_until timestamptz;
BEGIN
  IF p_actor_id IS NULL OR p_quote_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de recompra inválidos.';
  END IF;
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);

  SELECT * INTO v_source FROM public.quotes q WHERE q.id = p_quote_id FOR SHARE;
  IF NOT FOUND OR v_source.status::text NOT IN ('approved', 'approved_singular', 'converted')
     OR COALESCE(v_source.is_latest_version, true) IS NOT TRUE
     OR v_source.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente orçamento aprovado e vigente pode iniciar uma recompra.';
  END IF;
  IF v_source.seller_id IS DISTINCT FROM p_actor_id
     AND NOT public.can_manage_quote_scope(p_actor_id, p_quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este orçamento.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;
  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.quote_items WHERE quote_id = p_quote_id
     ) OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
       FROM jsonb_array_elements(p_items) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do orçamento uma única vez.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_actor_id::text || ':' || p_quote_id::text || ':' || trim(p_idempotency_key), 0
  ));
  SELECT * INTO v_existing FROM public.sicoob_quote_reorder_requests
  WHERE actor_id = p_actor_id AND source_quote_id = p_quote_id
    AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_source_item FROM public.quote_items
    WHERE id = (v_item ->> 'source_order_item_id')::uuid AND quote_id = p_quote_id;
    IF NOT FOUND
       OR v_source_item.product_id IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer
       OR NULLIF(v_source_item.source_variant_id, '') IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao orçamento de origem.';
    END IF;
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
    SELECT v_total + COALESCE(sum((personalization ->> 'total_cost')::numeric), 0)
      INTO v_total
      FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) source(personalization);
  END LOOP;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, client_email, client_phone, client_company, client_cnpj,
    seller_id, status, subtotal, total, notes, organization_id, pa_id, singular_id,
    payment_terms, delivery_time, shipping_type, shipping_cost, valid_until,
    reorder_source_quote_id, catalog_revalidated_at, catalog_valid_until,
    catalog_stock_is_reserved, reorder_price_changed_items
  ) VALUES (
    v_source.client_id, v_source.client_name, v_source.client_email, v_source.client_phone,
    v_source.client_company, v_source.client_cnpj, p_actor_id, 'draft', v_total, v_total,
    format('Recompra do orçamento Sicoob #%s. Preço, mínimo e estoque reconsultados; disponibilidade não reservada.', v_source.quote_number),
    v_source.organization_id, v_source.pa_id, v_source.singular_id,
    v_source.payment_terms, v_source.delivery_time, v_source.shipping_type, v_source.shipping_cost,
    CURRENT_DATE + 7, p_quote_id, statement_timestamp(), v_valid_until, false,
    (SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
     WHERE COALESCE((item ->> 'price_changed')::boolean, false))
  ) RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order,
      catalog_available_stock, catalog_minimum_quantity, catalog_valid_until,
      historical_unit_price, price_changed, catalog_stock_is_reserved
    ) VALUES (
      v_quote_id, v_item ->> 'product_id', v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''), NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer, (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''), NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''), NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''), (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order, (v_item ->> 'available_stock')::integer,
      (v_item ->> 'minimum_quantity')::integer, (v_item ->> 'catalog_valid_until')::timestamptz,
      NULLIF(v_item ->> 'historical_unit_price', '')::numeric,
      COALESCE((v_item ->> 'price_changed')::boolean, false), false
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, width_cm, height_cm,
        personalized_quantity, unit_cost, setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id, v_personalization ->> 'technique_id', v_personalization ->> 'technique_name',
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
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_quote_reorder_requests (
    actor_id, source_quote_id, idempotency_key, payload_hash, quote_id
  ) VALUES (p_actor_id, p_quote_id, trim(p_idempotency_key), p_request_hash, v_quote_id);

  INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
  VALUES (
    v_quote_id, p_actor_id, 'created', 'Recompra criada com nova consulta ao catálogo.',
    jsonb_build_object(
      'source_quote_id', p_quote_id,
      'catalog_valid_until', v_valid_until,
      'stock_is_reserved', false
    )
  );
  RETURN v_quote_id;
END;
$function$
