CREATE OR REPLACE FUNCTION public.reorder_sicoob_order_as_quote(p_order_id uuid, p_items jsonb, p_idempotency_key text, p_actor_id uuid, p_request_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_quote_id uuid;
  v_valid_until timestamptz;
BEGIN
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);
  v_quote_id := public.reorder_sicoob_order_as_quote_legacy_20260927(
    p_order_id, p_items, p_idempotency_key, p_actor_id, p_request_hash
  );

  IF EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = v_quote_id AND q.catalog_revalidated_at IS NULL
  ) THEN
    UPDATE public.quotes q
    SET reorder_source_order_id = p_order_id,
        catalog_revalidated_at = statement_timestamp(),
        catalog_valid_until = v_valid_until,
        catalog_stock_is_reserved = false,
        reorder_price_changed_items = (
          SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
          WHERE COALESCE((item ->> 'price_changed')::boolean, false)
        )
    WHERE q.id = v_quote_id;

    UPDATE public.quote_items qi
    SET catalog_available_stock = (source.item ->> 'available_stock')::integer,
        catalog_minimum_quantity = (source.item ->> 'minimum_quantity')::integer,
        catalog_valid_until = (source.item ->> 'catalog_valid_until')::timestamptz,
        historical_unit_price = NULLIF(source.item ->> 'historical_unit_price', '')::numeric,
        price_changed = COALESCE((source.item ->> 'price_changed')::boolean, false),
        catalog_stock_is_reserved = false
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS source(item, ordinality)
    WHERE qi.quote_id = v_quote_id
      AND COALESCE(qi.sort_order, 0) = source.ordinality::integer - 1;
  END IF;

  RETURN v_quote_id;
END;
$function$
