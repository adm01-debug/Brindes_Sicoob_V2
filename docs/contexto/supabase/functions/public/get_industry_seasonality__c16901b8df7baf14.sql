CREATE OR REPLACE FUNCTION public.get_industry_seasonality(_company_ids text[], _months integer DEFAULT 24)
 RETURNS TABLE(year integer, month integer, avg_quotes_per_company numeric, avg_revenue_per_company numeric, companies_active bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH per_client_month AS (
    SELECT
      q.client_id,
      EXTRACT(YEAR FROM q.created_at)::int AS y,
      EXTRACT(MONTH FROM q.created_at)::int AS m,
      COUNT(*)::numeric AS qc,
      COALESCE(SUM(q.total), 0)::numeric AS rev
    FROM public.quotes q
    WHERE q.client_id = ANY(_company_ids)
      AND q.status IN ('sent','viewed','approved','converted','pending_approval')
      AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
      AND auth.uid() IS NOT NULL
    GROUP BY q.client_id, 2, 3
  )
  SELECT
    y AS year,
    m AS month,
    AVG(qc)::numeric AS avg_quotes_per_company,
    AVG(rev)::numeric AS avg_revenue_per_company,
    COUNT(DISTINCT client_id)::bigint AS companies_active
  FROM per_client_month
  GROUP BY y, m
  ORDER BY y, m;
$function$
