-- sicoob_centrais nasceu com política apenas de leitura: nem admin conseguia
-- cadastrar/editar/excluir Central pela UI (o CRUD existe em
-- src/pages/admin/AdminCentraisPage.tsx). Estas políticas liberam escrita
-- somente para admin, mantendo a leitura já existente para authenticated.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sicoob_centrais TO authenticated;

DROP POLICY IF EXISTS sicoob_centrais_admin_insert ON public.sicoob_centrais;
CREATE POLICY sicoob_centrais_admin_insert
  ON public.sicoob_centrais
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS sicoob_centrais_admin_update ON public.sicoob_centrais;
CREATE POLICY sicoob_centrais_admin_update
  ON public.sicoob_centrais
  FOR UPDATE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS sicoob_centrais_admin_delete ON public.sicoob_centrais;
CREATE POLICY sicoob_centrais_admin_delete
  ON public.sicoob_centrais
  FOR DELETE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));
