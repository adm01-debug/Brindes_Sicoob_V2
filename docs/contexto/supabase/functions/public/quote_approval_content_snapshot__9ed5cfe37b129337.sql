CREATE OR REPLACE FUNCTION public.quote_approval_content_snapshot(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'quote_id', q.id,
    'quote_number', q.quote_number,
    'version', q.version,
    'row_version', q.row_version,
    'client_name', q.client_name,
    'currency', to_jsonb(q)->'currency',
    'subtotal', to_jsonb(q)->'subtotal',
    'discount_amount', to_jsonb(q)->'discount_amount',
    'shipping_cost', to_jsonb(q)->'shipping_cost',
    'total', q.total,
    'valid_until', q.valid_until,
    'payment_terms', to_jsonb(q)->'payment_terms',
    'delivery_time', to_jsonb(q)->'delivery_time',
    'notes', to_jsonb(q)->'notes',
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', qi.id,
        'product_id', qi.product_id,
        'product_name', qi.product_name,
        'product_sku', qi.product_sku,
        'variant_id', to_jsonb(qi)->'source_variant_id',
        'variant_sku', to_jsonb(qi)->'source_variant_sku',
        'color_name', qi.color_name,
        'color_hex', qi.color_hex,
        'size_code', to_jsonb(qi)->'size_code',
        'quantity', qi.quantity,
        'unit_price', qi.unit_price,
        'subtotal', qi.subtotal,
        'notes', qi.notes,
        'personalizations', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', qip.id,
            'technique_id', qip.technique_id,
            'colors_count', qip.colors_count,
            'positions_count', qip.positions_count,
            'area_cm2', qip.area_cm2,
            'setup_cost', qip.setup_cost,
            'unit_cost', qip.unit_cost,
            'total_cost', qip.total_cost,
            'notes', qip.notes
          ) ORDER BY qip.id)
          FROM public.quote_item_personalizations qip
          WHERE qip.quote_item_id=qi.id
        ), '[]'::jsonb)
      ) ORDER BY COALESCE((to_jsonb(qi)->>'display_order')::integer, qi.sort_order, 0), qi.id)
      FROM public.quote_items qi
      WHERE qi.quote_id=q.id
    ), '[]'::jsonb)
  )
  FROM public.quotes q
  WHERE q.id=p_quote_id;
$function$
