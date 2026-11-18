CREATE OR REPLACE FUNCTION public.get_public_favorite_reactions(_token text, _anon_id text)
 RETURNS TABLE(item_id uuid, emoji text, anon_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    reaction.item_id,
    reaction.emoji,
    CASE WHEN reaction.anon_id = left(_anon_id, 160) THEN left(_anon_id, 160) ELSE '' END
  FROM public.favorite_lists AS list
  JOIN public.favorite_item_reactions AS reaction ON reaction.list_id = list.id
  WHERE length(_token) BETWEEN 32 AND 128
    AND length(_anon_id) BETWEEN 8 AND 160
    AND list.shared_token = _token
    AND (list.shared_expires_at IS NULL OR list.shared_expires_at > statement_timestamp())
$function$
