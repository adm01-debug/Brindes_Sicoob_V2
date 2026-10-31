-- Preserva a autoria da taxonomia editorial e alinha a auditoria RLS ao papel dev.

CREATE OR REPLACE FUNCTION public.preserve_catalog_marketing_term_authorship()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by é imutável em catalog_marketing_terms';
  END IF;

  NEW.updated_by := (SELECT auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_catalog_marketing_term_authorship
  ON public.catalog_marketing_terms;
CREATE TRIGGER preserve_catalog_marketing_term_authorship
  BEFORE UPDATE ON public.catalog_marketing_terms
  FOR EACH ROW EXECUTE FUNCTION public.preserve_catalog_marketing_term_authorship();

REVOKE ALL ON FUNCTION public.preserve_catalog_marketing_term_authorship()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Curadores inserem termos de marketing"
  ON public.catalog_marketing_terms;
CREATE POLICY "Curadores inserem termos de marketing"
  ON public.catalog_marketing_terms
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sicoob_rls_audit_logs'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.sicoob_rls_audit_logs',
      policy_name
    );
  END LOOP;
END
$$;

CREATE POLICY "Devs consultam auditoria RLS"
  ON public.sicoob_rls_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.can_view_audit_logs((SELECT auth.uid()))));

REVOKE ALL ON TABLE public.sicoob_rls_audit_logs FROM anon;
GRANT SELECT ON TABLE public.sicoob_rls_audit_logs TO authenticated;

COMMENT ON FUNCTION public.preserve_catalog_marketing_term_authorship() IS
  'Impede alteração de created_by e registra updated_by com o usuário autenticado.';
