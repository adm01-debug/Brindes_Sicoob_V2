CREATE OR REPLACE FUNCTION public.get_top_favorited_products(_days integer DEFAULT 7, _limit integer DEFAULT 6)
 RETURNS TABLE(product_id text, fav_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    fi.product_id,
    COUNT(*)::bigint AS fav_count
  FROM public.favorite_items fi
  WHERE fi.added_at >= (now() - make_interval(days => GREATEST(_days, 1)))
  GROUP BY fi.product_id
  ORDER BY fav_count DESC, MAX(fi.added_at) DESC
  LIMIT GREATEST(_limit, 1);
$function$
