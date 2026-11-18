CREATE OR REPLACE FUNCTION public.quote_approval_public_items(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', qi.product_name,
    'product_sku', qi.product_sku,
    'color_name', qi.color_name,
    'size_code', to_jsonb(qi)->'size_code',
    'quantity', qi.quantity,
    'unit_price', qi.unit_price,
    'subtotal', qi.subtotal,
    'personalizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'colors_count', qip.colors_count,
        'positions_count', qip.positions_count,
        'notes', qip.notes
      ) ORDER BY qip.id)
      FROM public.quote_item_personalizations qip
      WHERE qip.quote_item_id = qi.id
    ), '[]'::jsonb)
  ) ORDER BY COALESCE((to_jsonb(qi)->>'display_order')::integer, qi.sort_order, 0), qi.id), '[]'::jsonb)
  FROM public.quote_items qi
  WHERE qi.quote_id = p_quote_id;
$function$
