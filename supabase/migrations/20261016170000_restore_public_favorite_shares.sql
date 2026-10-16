-- Restaura o contrato da rota pública /lista/:token. O consolidador histórico
-- preservou o ramo anon na expressão, mas removeu anon da lista de papéis da
-- policy; o PostgreSQL filtra o papel antes de avaliar USING.

ALTER POLICY sicoob_merged_c610d3ce492e686d_select
  ON public.favorite_lists
  TO public;

ALTER POLICY sicoob_merged_dc61530269200178_select
  ON public.favorite_items
  TO public;

DO $assert$
DECLARE
  v_lists_roles name[];
  v_items_roles name[];
  v_lists_qual text;
  v_items_qual text;
BEGIN
  SELECT roles, qual
  INTO v_lists_roles, v_lists_qual
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'favorite_lists'
    AND policyname = 'sicoob_merged_c610d3ce492e686d_select'
    AND cmd = 'SELECT';

  SELECT roles, qual
  INTO v_items_roles, v_items_qual
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'favorite_items'
    AND policyname = 'sicoob_merged_dc61530269200178_select'
    AND cmd = 'SELECT';

  IF v_lists_roles IS DISTINCT FROM ARRAY['public']::name[]
     OR v_items_roles IS DISTINCT FROM ARRAY['public']::name[]
     OR v_lists_qual NOT LIKE '%shared_token%'
     OR v_lists_qual NOT LIKE '%shared_expires_at%'
     OR v_items_qual NOT LIKE '%shared_token%'
     OR v_items_qual NOT LIKE '%shared_expires_at%' THEN
    RAISE EXCEPTION 'Contrato inválido: compartilhamento público de favoritos não alcança anon.';
  END IF;

  IF NOT pg_catalog.has_table_privilege('anon', 'public.favorite_lists', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('anon', 'public.favorite_items', 'SELECT') THEN
    RAISE EXCEPTION 'Contrato inválido: anon não possui SELECT nas tabelas públicas de favoritos.';
  END IF;
END
$assert$;
