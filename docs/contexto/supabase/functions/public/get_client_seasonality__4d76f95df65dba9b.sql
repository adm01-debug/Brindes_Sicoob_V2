CREATE OR REPLACE FUNCTION public.get_client_seasonality(_client_id text, _months integer DEFAULT 24)
 RETURNS TABLE(year integer, month integer, quotes_count bigint, total_revenue numeric, avg_ticket numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXTRACT(YEAR FROM q.created_at)::int AS year,
    EXTRACT(MONTH FROM q.created_at)::int AS month,
    COUNT(*)::bigint AS quotes_count,
    COALESCE(SUM(q.total), 0)::numeric AS total_revenue,
    COALESCE(AVG(q.total), 0)::numeric AS avg_ticket
  FROM public.quotes q
  WHERE q.client_id = _client_id
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
    AND (
      q.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  GROUP BY 1, 2
  ORDER BY 1, 2;
$function$
