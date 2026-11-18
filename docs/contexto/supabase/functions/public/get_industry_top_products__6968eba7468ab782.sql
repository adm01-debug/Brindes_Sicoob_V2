CREATE OR REPLACE FUNCTION public.get_industry_top_products(_company_ids text[], _days integer DEFAULT 90, _limit integer DEFAULT 10)
 RETURNS TABLE(product_id text, product_name text, product_image_url text, total_quantity bigint, unique_clients bigint, unique_sellers bigint, total_revenue numeric, avg_unit_price numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    qi.product_id,
    qi.product_name,
    MAX(qi.product_image_url) AS product_image_url,
    SUM(qi.quantity)::bigint AS total_quantity,
    COUNT(DISTINCT q.client_id)::bigint AS unique_clients,
    COUNT(DISTINCT q.seller_id)::bigint AS unique_sellers,
    SUM(COALESCE(qi.subtotal, qi.quantity * qi.unit_price))::numeric AS total_revenue,
    AVG(qi.unit_price)::numeric AS avg_unit_price
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id = ANY(_company_ids)
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND q.created_at >= now() - (GREATEST(_days, 1) || ' days')::interval
    AND (
      auth.uid() IS NOT NULL  -- qualquer usuário autenticado vê tendências do setor
    )
  GROUP BY qi.product_id, qi.product_name
  ORDER BY total_quantity DESC, unique_clients DESC
  LIMIT GREATEST(_limit, 1);
$function$
