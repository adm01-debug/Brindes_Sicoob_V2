CREATE OR REPLACE FUNCTION public.sicoob_export_orders_for_actor(p_actor_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF sicoob_orders
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.* FROM public.sicoob_orders o
  WHERE public.sicoob_actor_can_manage_fulfillment(p_actor_id, o.id)
    AND (NULLIF(p_filters->>'status', '') IS NULL OR o.status = p_filters->>'status')
    AND (NULLIF(p_filters->>'start_date', '') IS NULL OR o.created_at >= (p_filters->>'start_date')::timestamptz)
    AND (NULLIF(p_filters->>'end_date', '') IS NULL OR o.created_at < ((p_filters->>'end_date')::date + 1)::timestamptz)
  ORDER BY o.created_at DESC, o.id;
$function$
