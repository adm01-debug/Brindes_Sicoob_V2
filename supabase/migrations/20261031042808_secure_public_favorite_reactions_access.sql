-- Reações públicas só são lidas pelo RPC validado por token. O endpoint de
-- escrita também é a Edge Function; clientes não recebem INSERT direto.
DO $preflight$
DECLARE
  select_policy_count integer;
  insert_policy_count integer;
BEGIN
  SELECT count(*)
    INTO select_policy_count
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'favorite_item_reactions'
     AND cmd = 'SELECT'
     AND permissive = 'PERMISSIVE';

  SELECT count(*)
    INTO insert_policy_count
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'favorite_item_reactions'
     AND cmd = 'INSERT'
     AND permissive = 'PERMISSIVE';

  IF select_policy_count <> 1 OR insert_policy_count <> 1 THEN
    RAISE EXCEPTION
      'Estado RLS inesperado em favorite_item_reactions: SELECT %, INSERT %; esperado uma policy consolidada por operação.',
      select_policy_count,
      insert_policy_count;
  END IF;
END
$preflight$;

DO $replace_policies$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname, cmd
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'favorite_item_reactions'
       AND cmd IN ('SELECT', 'INSERT')
       AND permissive = 'PERMISSIVE'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.favorite_item_reactions',
      existing_policy.policyname
    );
  END LOOP;
END
$replace_policies$;

REVOKE SELECT, INSERT ON TABLE public.favorite_item_reactions FROM anon;
REVOKE INSERT ON TABLE public.favorite_item_reactions FROM authenticated;
GRANT SELECT ON TABLE public.favorite_item_reactions TO authenticated;

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
  IF pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.favorite_item_reactions', 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.favorite_item_reactions', 'INSERT')
     OR NOT pg_catalog.has_table_privilege(
       'authenticated', 'public.favorite_item_reactions', 'SELECT'
     )
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'favorite_item_reactions'
          AND cmd IN ('SELECT', 'INSERT')
          AND ('anon'::name = ANY(roles) OR 'public'::name = ANY(roles))
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
      'Contrato inválido: acesso direto às reações não foi restrito ao proprietário/admin e ao RPC público.';
  END IF;
END
$assert$;
