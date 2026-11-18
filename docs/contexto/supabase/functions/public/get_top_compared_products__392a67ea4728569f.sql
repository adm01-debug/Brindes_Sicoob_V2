CREATE OR REPLACE FUNCTION public.get_top_compared_products(p_limit integer DEFAULT 6)
 RETURNS TABLE(product_id text, comparison_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (item->>'productId')::text AS product_id,
    count(*)::bigint AS comparison_count
  FROM public.user_comparisons,
       jsonb_array_elements(items) AS item
  WHERE updated_at > now() - interval '30 days'
  GROUP BY (item->>'productId')
  ORDER BY comparison_count DESC
  LIMIT p_limit;
$function$
