CREATE OR REPLACE FUNCTION public.get_public_favorite_list(_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'list', jsonb_build_object(
      'id', list.id,
      'name', list.name,
      'description', list.description,
      'color', list.color,
      'shared_expires_at', list.shared_expires_at
    ),
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'product_id', item.product_id,
          'variant_info', item.variant_info,
          'note', item.note,
          'added_at', item.added_at
        ) ORDER BY item.position, item.added_at DESC
      )
      FROM public.favorite_items AS item
      WHERE item.list_id = list.id
    ), '[]'::jsonb)
  )
  FROM public.favorite_lists AS list
  WHERE length(_token) BETWEEN 32 AND 128
    AND list.shared_token = _token
    AND (list.shared_expires_at IS NULL OR list.shared_expires_at > statement_timestamp())
  LIMIT 1
$function$
