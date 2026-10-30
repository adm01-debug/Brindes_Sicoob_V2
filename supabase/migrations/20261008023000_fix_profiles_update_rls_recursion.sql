-- Remove a autorreferência da policy UPDATE de profiles.
--
-- A consolidação de policies preservou uma regra legada que consultava
-- public.profiles dentro da própria policy de public.profiles. O Postgres
-- interrompe essa avaliação com 42P17 antes mesmo de verificar se a linha
-- alvo existe. As funções public.has_role são SECURITY DEFINER e consultam
-- user_roles, portanto preservam a autorização administrativa sem recursão.

DO $preflight$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'public.profiles não existe; correção RLS cancelada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'sicoob_merged_49a6a498d072653c_update'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Policy UPDATE canônica de profiles não encontrada; correção cancelada.';
  END IF;
END;
$preflight$;

DROP POLICY IF EXISTS sicoob_merged_49a6a498d072653c_update ON public.profiles;

CREATE POLICY sicoob_merged_49a6a498d072653c_update
ON public.profiles
FOR UPDATE
TO public
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
  OR (
    pg_has_role(current_user, 'authenticated', 'member')
    AND user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
  OR (
    pg_has_role(current_user, 'authenticated', 'member')
    AND user_id = (SELECT auth.uid())
  )
);

COMMENT ON POLICY sicoob_merged_49a6a498d072653c_update ON public.profiles IS
'UPDATE sem autorreferência: próprio usuário ou papéis admin/supervisor via helper SECURITY DEFINER.';

DO $contract$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'UPDATE'
      AND concat_ws(' ', qual, with_check) ~* '\mFROM\s+(public\.)?profiles\M'
  ) THEN
    RAISE EXCEPTION 'A policy UPDATE de profiles continua autorreferente; lote cancelado.';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'UPDATE'
  ) <> 1 THEN
    RAISE EXCEPTION 'Contrato UPDATE de profiles divergente; lote cancelado.';
  END IF;
END;
$contract$;
