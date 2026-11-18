CREATE OR REPLACE FUNCTION public.get_client_top_products(_client_id text, _limit integer DEFAULT 10)
 RETURNS TABLE(product_id text, product_name text, product_image_url text, total_quantity bigint, occurrences bigint, total_revenue numeric, avg_unit_price numeric, last_quoted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    qi.product_id,
    qi.product_name,
    MAX(qi.product_image_url) AS product_image_url,
    SUM(qi.quantity)::bigint AS total_quantity,
    COUNT(DISTINCT qi.quote_id)::bigint AS occurrences,
    SUM(COALESCE(qi.subtotal, qi.quantity * qi.unit_price))::numeric AS total_revenue,
    AVG(qi.unit_price)::numeric AS avg_unit_price,
    MAX(q.created_at) AS last_quoted_at
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id = _client_id
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND (
      q.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  GROUP BY qi.product_id, qi.product_name
  ORDER BY total_quantity DESC, occurrences DESC
  LIMIT GREATEST(_limit, 1);
$function$
