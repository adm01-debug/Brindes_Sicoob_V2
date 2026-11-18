CREATE OR REPLACE FUNCTION public.get_top_collected_products(_days integer DEFAULT 7, _limit integer DEFAULT 6)
 RETURNS TABLE(product_id text, col_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    ci.product_id,
    COUNT(*)::bigint AS col_count
  FROM public.collection_items ci
  WHERE ci.created_at >= (now() - make_interval(days => GREATEST(_days, 1)))
  GROUP BY ci.product_id
  ORDER BY col_count DESC, MAX(ci.created_at) DESC
  LIMIT GREATEST(_limit, 1);
$function$
