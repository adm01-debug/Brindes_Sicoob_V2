-- Expõe somente a lista identificada pelo token secreto. Acesso SELECT direto
-- permitiria enumeração de todas as listas compartilhadas e ainda faria anon
-- avaliar helpers administrativos presentes na policy consolidada.

ALTER POLICY sicoob_merged_c610d3ce492e686d_select
  ON public.favorite_lists
  TO authenticated, service_role;

ALTER POLICY sicoob_merged_dc61530269200178_select
  ON public.favorite_items
  TO authenticated, service_role;

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
      'shared_expires_at', list.shared_expires_at,
      'user_id', list.user_id
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

CREATE OR REPLACE FUNCTION public.get_public_favorite_reactions(_token text)
RETURNS TABLE (
  id uuid,
  item_id uuid,
  emoji text,
  anon_id text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT reaction.id, reaction.item_id, reaction.emoji, reaction.anon_id, reaction.created_at
  FROM public.favorite_lists AS list
  JOIN public.favorite_item_reactions AS reaction ON reaction.list_id = list.id
  WHERE length(_token) BETWEEN 32 AND 128
    AND list.shared_token = _token
    AND (list.shared_expires_at IS NULL OR list.shared_expires_at > statement_timestamp())
  ORDER BY reaction.created_at
$function$;

REVOKE ALL ON FUNCTION public.get_public_favorite_list(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_favorite_reactions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_list(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_reactions(text) TO anon, authenticated, service_role;

DO $assert$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('favorite_lists', 'favorite_items')
      AND cmd = 'SELECT'
      AND 'anon'::name = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: anon ainda pode enumerar favoritos diretamente.';
  END IF;

  IF NOT pg_catalog.has_function_privilege('anon', 'public.get_public_favorite_list(text)', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('anon', 'public.get_public_favorite_reactions(text)', 'EXECUTE')
     OR NOT COALESCE((
       SELECT prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
       FROM pg_catalog.pg_proc
       WHERE oid = 'public.get_public_favorite_list(text)'::regprocedure
     ), false) THEN
    RAISE EXCEPTION 'Contrato inválido: RPC pública de favoritos não está protegida.';
  END IF;
END
$assert$;
