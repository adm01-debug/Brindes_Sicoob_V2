CREATE OR REPLACE FUNCTION public.get_user_recent_comparisons(p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, name text, client_name text, items jsonb, item_count integer, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    uc.id,
    uc.name,
    uc.client_name,
    uc.items,
    jsonb_array_length(uc.items) AS item_count,
    uc.updated_at
  FROM public.user_comparisons uc
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.updated_at DESC
  LIMIT p_limit;
$function$
