-- Corretiva forward-only: substitui has_role literal por helper semantico
-- nas policies de favoritos (AGENTS.md: policy nova usa helper semantico,
-- nunca has_role(...,'admin')).
--
-- A migration 20261031042808_secure_public_favorite_reactions_access.sql
-- (ja mesclada, imutavel, ainda pendente em producao nesta allowlist) criou
-- tres policies SELECT com `has_role((SELECT auth.uid()), 'admin')`. A regra
-- do AGENTS.md exige public.is_admin(auth.uid()), que reconhece os demais
-- papeis administrativos (admin + dev). Esta corretiva roda logo apos a
-- original no mesmo lote, preservando o SQL ja mesclado.

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('favorite_lists', 'favorite_items', 'favorite_item_reactions')
       AND policyname IN (
         'favorite_lists_owner_admin_select',
         'favorite_items_owner_admin_select',
         'favorite_reactions_owner_admin_select'
       )
  ) THEN
    RAISE EXCEPTION
      'Policies de favoritos ausentes; aplique 20261031042808 antes desta corretiva.';
  END IF;
END
$preflight$;

DROP POLICY IF EXISTS favorite_lists_owner_admin_select ON public.favorite_lists;
CREATE POLICY favorite_lists_owner_admin_select
  ON public.favorite_lists
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS favorite_items_owner_admin_select ON public.favorite_items;
CREATE POLICY favorite_items_owner_admin_select
  ON public.favorite_items
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS favorite_reactions_owner_admin_select ON public.favorite_item_reactions;
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
    OR public.is_admin(auth.uid())
  );

DO $assert$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('favorite_lists', 'favorite_items', 'favorite_item_reactions')
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE'
       AND (COALESCE(qual, '') ILIKE '%has_role%' OR COALESCE(qual, '') ILIKE '%admin%app_role%')
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'favorite_lists'
       AND policyname = 'favorite_lists_owner_admin_select'
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE'
       AND roles = ARRAY['authenticated'::name]
       AND qual ILIKE '%is_admin%'
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'favorite_items'
       AND policyname = 'favorite_items_owner_admin_select'
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE'
       AND roles = ARRAY['authenticated'::name]
       AND qual ILIKE '%is_admin%'
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'favorite_item_reactions'
       AND policyname = 'favorite_reactions_owner_admin_select'
       AND cmd = 'SELECT'
       AND permissive = 'PERMISSIVE'
       AND roles = ARRAY['authenticated'::name]
       AND qual ILIKE '%is_admin%'
  ) THEN
    RAISE EXCEPTION
      'Contrato invalido: policies de favoritos ainda usam has_role literal.';
  END IF;
END
$assert$;
