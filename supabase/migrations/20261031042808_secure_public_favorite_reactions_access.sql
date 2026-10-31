-- O compartilhamento público é acessado somente pelos RPCs validados por
-- token. Leitura direta permanece restrita ao proprietário/admin; escrita de
-- reações passa pela Edge Function, sem INSERT direto de clientes.
DO $preflight$
DECLARE
  target_table name;
  select_policy_count integer;
  insert_policy_count integer;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'favorite_lists'::name,
    'favorite_items'::name,
    'favorite_item_reactions'::name
  ] LOOP
    SELECT count(*)
      INTO select_policy_count
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = target_table
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE';

    IF select_policy_count <> 1 THEN
      RAISE EXCEPTION
        'Estado RLS inesperado em %: encontradas % policies SELECT permissivas; esperada uma policy consolidada.',
        target_table,
        select_policy_count;
    END IF;
  END LOOP;

  SELECT count(*)
    INTO insert_policy_count
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'favorite_item_reactions'
     AND cmd = 'INSERT'
     AND permissive = 'PERMISSIVE';

  IF insert_policy_count <> 1 THEN
    RAISE EXCEPTION
      'Estado RLS inesperado em favorite_item_reactions: INSERT %; esperada uma policy consolidada.',
      insert_policy_count;
  END IF;
END
$preflight$;

DO $replace_policies$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT tablename, policyname, cmd
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('favorite_lists', 'favorite_items', 'favorite_item_reactions')
       AND (cmd = 'SELECT' OR (tablename = 'favorite_item_reactions' AND cmd = 'INSERT'))
       AND permissive = 'PERMISSIVE'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  END LOOP;
END
$replace_policies$;

REVOKE ALL PRIVILEGES ON TABLE public.favorite_lists, public.favorite_items,
  public.favorite_item_reactions FROM anon;
REVOKE INSERT ON TABLE public.favorite_item_reactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.favorite_lists, public.favorite_items,
  public.favorite_item_reactions TO authenticated;

CREATE POLICY favorite_lists_owner_admin_select
  ON public.favorite_lists
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY favorite_items_owner_admin_select
  ON public.favorite_items
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY favorite_reactions_owner_admin_select
  ON public.favorite_item_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.favorite_lists AS owned_list
       WHERE owned_list.id = favorite_item_reactions.list_id
         AND owned_list.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

DO $assert$
BEGIN
  IF pg_catalog.has_table_privilege('anon', 'public.favorite_lists', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_lists', 'INSERT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_lists', 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_lists', 'DELETE')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_items', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_items', 'INSERT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_items', 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_items', 'DELETE')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'INSERT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'DELETE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.favorite_item_reactions', 'INSERT')
     OR NOT pg_catalog.has_table_privilege('authenticated', 'public.favorite_lists', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('authenticated', 'public.favorite_items', 'SELECT')
     OR NOT pg_catalog.has_table_privilege(
       'authenticated', 'public.favorite_item_reactions', 'SELECT'
     )
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('favorite_lists', 'favorite_items', 'favorite_item_reactions')
          AND cmd = 'SELECT'
          AND ('anon'::name = ANY(roles) OR 'public'::name = ANY(roles))
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'favorite_lists'
          AND policyname = 'favorite_lists_owner_admin_select'
          AND cmd = 'SELECT'
          AND permissive = 'PERMISSIVE'
          AND roles = ARRAY['authenticated'::name]
          AND qual ILIKE '%user_id%auth.uid%'
          AND qual ILIKE '%has_role%admin%'
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'favorite_items'
          AND policyname = 'favorite_items_owner_admin_select'
          AND cmd = 'SELECT'
          AND permissive = 'PERMISSIVE'
          AND roles = ARRAY['authenticated'::name]
          AND qual ILIKE '%user_id%auth.uid%'
          AND qual ILIKE '%has_role%admin%'
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'favorite_item_reactions'
          AND policyname = 'favorite_reactions_owner_admin_select'
          AND cmd = 'SELECT'
          AND permissive = 'PERMISSIVE'
          AND roles = ARRAY['authenticated'::name]
          AND qual ILIKE '%owned_list.user_id%'
          AND qual ILIKE '%has_role%admin%'
     )
     OR NOT pg_catalog.has_function_privilege(
       'anon', 'public.get_public_favorite_reactions(text,text)', 'EXECUTE'
     ) THEN
    RAISE EXCEPTION
      'Contrato inválido: favoritos diretos não estão limitados a owner/admin ou RPC público não está disponível.';
  END IF;
END
$assert$;
