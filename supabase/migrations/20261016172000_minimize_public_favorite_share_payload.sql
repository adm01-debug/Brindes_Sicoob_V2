-- Minimiza identificadores públicos: a página não usa user_id e visitantes
-- não precisam receber os pseudônimos de reação de outras pessoas.

CREATE OR REPLACE FUNCTION public.get_public_favorite_list(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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
$function$;

DROP FUNCTION public.get_public_favorite_reactions(text);

CREATE FUNCTION public.get_public_favorite_reactions(_token text, _anon_id text)
RETURNS TABLE (
  item_id uuid,
  emoji text,
  anon_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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
$function$;

REVOKE ALL ON FUNCTION public.get_public_favorite_reactions(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_reactions(text, text)
  TO anon, authenticated, service_role;

DO $assert$
BEGIN
  IF pg_catalog.to_regprocedure('public.get_public_favorite_reactions(text)') IS NOT NULL
     OR NOT pg_catalog.has_function_privilege(
       'anon', 'public.get_public_favorite_reactions(text,text)', 'EXECUTE'
     )
     OR pg_catalog.pg_get_functiondef('public.get_public_favorite_list(text)'::regprocedure)
       LIKE '%''user_id'', list.user_id%' THEN
    RAISE EXCEPTION 'Contrato inválido: payload público de favoritos ainda expõe identificadores.';
  END IF;
END
$assert$;
