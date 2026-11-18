CREATE OR REPLACE FUNCTION public.get_collections_weekly_count(_weeks integer DEFAULT 8)
 RETURNS TABLE(week_start date, item_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now())::date - (GREATEST(_weeks, 1) - 1) * 7,
      date_trunc('week', now())::date,
      '7 days'::interval
    )::date AS week_start
  )
  SELECT
    w.week_start,
    COALESCE(COUNT(ci.id), 0)::bigint AS item_count
  FROM weeks w
  LEFT JOIN public.collection_items ci
    ON date_trunc('week', ci.created_at)::date = w.week_start
    AND EXISTS (SELECT 1 FROM public.collections c WHERE c.id = ci.collection_id AND c.user_id = auth.uid())
  GROUP BY w.week_start
  ORDER BY w.week_start ASC;
$function$
