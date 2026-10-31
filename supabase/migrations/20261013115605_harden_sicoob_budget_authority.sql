-- Fecha as permissões alternativas que permitiam a gestores e gerentes
-- alterar verbas fora da autoridade institucional esperada.

CREATE OR REPLACE FUNCTION public.is_gestor_compras(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(_user_id, 'gestor_compras'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_gerente_pa(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(_user_id, 'gerente_pa'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_cooperativa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile.cooperativa_id
    FROM public.profiles AS profile
   WHERE (profile.user_id = (SELECT auth.uid()) OR profile.id = (SELECT auth.uid()))
     AND profile.is_active IS TRUE
     AND profile.deleted_at IS NULL
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_pa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile.pa_id
    FROM public.profiles AS profile
   WHERE (profile.user_id = (SELECT auth.uid()) OR profile.id = (SELECT auth.uid()))
     AND profile.is_active IS TRUE
     AND profile.deleted_at IS NULL
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_gestor_compras(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_gerente_pa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_cooperativa_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_pa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor_compras(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gerente_pa(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_cooperativa_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_pa_id() TO authenticated, service_role;

-- As policies históricas foram consolidadas em expressões permissivas. Os
-- guardas restritivos abaixo são avaliados em conjunto com qualquer policy
-- permissiva e impedem que uma alternativa antiga amplie o escopo novamente.
DROP POLICY IF EXISTS pa_budgets_active_scope_select_guard ON public.pa_budgets;
DROP POLICY IF EXISTS pa_budgets_buyer_select ON public.pa_budgets;
CREATE POLICY pa_budgets_buyer_select
ON public.pa_budgets
FOR SELECT
TO authenticated
USING (
  (
    public.has_role((SELECT auth.uid()), 'comprador_pac'::public.app_role)
    AND pa_budgets.pa_id = public.current_user_pa_id()
  )
  OR (
    public.has_role((SELECT auth.uid()), 'comprador_singular'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
);

CREATE POLICY pa_budgets_active_scope_select_guard
ON public.pa_budgets
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
  OR (
    public.has_role((SELECT auth.uid()), 'gerente_pa'::public.app_role)
    AND pa_budgets.pa_id = public.current_user_pa_id()
  )
  OR (
    public.has_role((SELECT auth.uid()), 'comprador_pac'::public.app_role)
    AND pa_budgets.pa_id = public.current_user_pa_id()
  )
  OR (
    public.has_role((SELECT auth.uid()), 'comprador_singular'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
);

DROP POLICY IF EXISTS pa_budgets_active_scope_insert_guard ON public.pa_budgets;
CREATE POLICY pa_budgets_active_scope_insert_guard
ON public.pa_budgets
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
);

DROP POLICY IF EXISTS pa_budgets_active_scope_update_guard ON public.pa_budgets;
CREATE POLICY pa_budgets_active_scope_update_guard
ON public.pa_budgets
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
)
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = pa_budgets.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
);

DROP POLICY IF EXISTS pa_budgets_active_scope_delete_guard ON public.pa_budgets;
CREATE POLICY pa_budgets_active_scope_delete_guard
ON public.pa_budgets
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

-- A verba agregada da cooperativa herdava uma alternativa global baseada
-- apenas no papel gestor. Os guardas abaixo exigem o vínculo institucional
-- ativo e impedem criação ou alteração em outra cooperativa.
DROP POLICY IF EXISTS cooperativa_budgets_active_scope_select_guard
  ON public.cooperativa_budgets;
CREATE POLICY cooperativa_budgets_active_scope_select_guard
ON public.cooperativa_budgets
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR cooperativa_budgets.cooperativa_id = public.current_user_cooperativa_id()
);

DROP POLICY IF EXISTS cooperativa_budgets_active_scope_insert_guard
  ON public.cooperativa_budgets;
CREATE POLICY cooperativa_budgets_active_scope_insert_guard
ON public.cooperativa_budgets
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND cooperativa_budgets.cooperativa_id = public.current_user_cooperativa_id()
  )
);

DROP POLICY IF EXISTS cooperativa_budgets_active_scope_update_guard
  ON public.cooperativa_budgets;
CREATE POLICY cooperativa_budgets_active_scope_update_guard
ON public.cooperativa_budgets
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND cooperativa_budgets.cooperativa_id = public.current_user_cooperativa_id()
  )
)
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
    AND cooperativa_budgets.cooperativa_id = public.current_user_cooperativa_id()
  )
);

DROP POLICY IF EXISTS cooperativa_budgets_active_scope_delete_guard
  ON public.cooperativa_budgets;
CREATE POLICY cooperativa_budgets_active_scope_delete_guard
ON public.cooperativa_budgets
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

-- Consumo e estorno de verba pertencem às rotinas transacionais de pedido,
-- executadas com privilégio de servidor. Clientes autenticados só podem
-- alocar a verba e sua alçada; nunca escrever o saldo consumido diretamente.
REVOKE ALL ON TABLE public.pa_budgets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.pa_budgets FROM authenticated;
GRANT SELECT ON TABLE public.pa_budgets TO authenticated;
GRANT INSERT (pa_id, ano, mes, verba_total, limite_alcada, observacoes)
  ON public.pa_budgets TO authenticated;
GRANT UPDATE (verba_total, limite_alcada, observacoes)
  ON public.pa_budgets TO authenticated;

REVOKE ALL ON TABLE public.cooperativa_budgets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cooperativa_budgets FROM authenticated;
GRANT SELECT ON TABLE public.cooperativa_budgets TO authenticated;
GRANT INSERT (cooperativa_id, ano, mes, verba_total, limite_alcada, observacoes)
  ON public.cooperativa_budgets TO authenticated;
GRANT UPDATE (verba_total, limite_alcada, observacoes)
  ON public.cooperativa_budgets TO authenticated;

-- O vínculo institucional é fonte de autoridade para RLS. O próprio usuário
-- pode manter dados pessoais, mas não pode trocar identidade, escopo, alçada
-- ou estado da conta. Administração ativa, service_role e o proprietário da
-- tabela preservam os fluxos administrativos já existentes.
CREATE OR REPLACE FUNCTION public.guard_profile_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_is_trusted_writer boolean :=
    current_user = pg_catalog.pg_get_userbyid((
      SELECT relation.relowner
        FROM pg_catalog.pg_class AS relation
       WHERE relation.oid = TG_RELID
    ))
    OR pg_catalog.pg_has_role(current_user, 'service_role', 'member')
    OR public.is_admin((SELECT auth.uid()));
BEGIN
  IF NOT v_is_trusted_writer THEN
    IF TG_OP = 'INSERT' AND (
      NEW.user_id IS DISTINCT FROM (SELECT auth.uid())
      OR NEW.role IS DISTINCT FROM 'vendedor'
      OR NEW.is_active IS DISTINCT FROM false
      OR NEW.deleted_at IS NOT NULL
      OR NEW.cooperativa_id IS NOT NULL
      OR NEW.pa_id IS NOT NULL
      OR NEW.singular_id IS NOT NULL
      OR NEW.carteira_id IS NOT NULL
      OR NEW.approval_threshold NOT IN (5000)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'O autocadastro de perfil deve permanecer inativo e sem autoridade institucional.';
    ELSIF TG_OP = 'UPDATE' AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.cooperativa_id IS DISTINCT FROM OLD.cooperativa_id
      OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
      OR NEW.singular_id IS DISTINCT FROM OLD.singular_id
      OR NEW.carteira_id IS DISTINCT FROM OLD.carteira_id
      OR NEW.approval_threshold IS DISTINCT FROM OLD.approval_threshold
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Campos de autoridade do perfil só podem ser alterados pela administração.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_profile_authority_fields()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS aaa_guard_profile_authority_fields ON public.profiles;
CREATE TRIGGER aaa_guard_profile_authority_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_authority_fields();

DO $postflight$
BEGIN
  IF public.is_gestor_compras(NULL) OR public.is_gerente_pa(NULL) THEN
    RAISE EXCEPTION 'Helpers de papel não falharam fechados para ator nulo.';
  END IF;

  IF has_column_privilege('authenticated', 'public.pa_budgets', 'verba_consumida', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.pa_budgets', 'verba_consumida', 'INSERT')
     OR NOT has_column_privilege('authenticated', 'public.pa_budgets', 'verba_total', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.pa_budgets', 'verba_total', 'INSERT') THEN
    RAISE EXCEPTION 'Privilégios de colunas financeiras não correspondem ao contrato.';
  END IF;

  IF has_table_privilege('authenticated', 'public.pa_budgets', 'DELETE')
     OR has_table_privilege('authenticated', 'public.cooperativa_budgets', 'DELETE')
     OR has_column_privilege('authenticated', 'public.cooperativa_budgets', 'cooperativa_id', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.cooperativa_budgets', 'verba_total', 'UPDATE') THEN
    RAISE EXCEPTION 'Privilégios de exclusão ou identidade das verbas estão incorretos.';
  END IF;

  IF (
    SELECT count(*)
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'pa_budgets'
       AND permissive = 'RESTRICTIVE'
       AND policyname LIKE 'pa_budgets_active_scope_%_guard'
  ) <> 4 THEN
    RAISE EXCEPTION 'Os quatro guardas restritivos de pa_budgets não foram instalados.';
  END IF;

  IF (
    SELECT count(*)
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'cooperativa_budgets'
       AND permissive = 'RESTRICTIVE'
       AND policyname LIKE 'cooperativa_budgets_active_scope_%_guard'
  ) <> 4 THEN
    RAISE EXCEPTION 'Os quatro guardas restritivos de cooperativa_budgets não foram instalados.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.profiles'::regclass
       AND tgname = 'aaa_guard_profile_authority_fields'
       AND (tgtype & 4) = 4
       AND (tgtype & 16) = 16
       AND NOT tgisinternal
  ) OR (SELECT prosecdef
          FROM pg_proc
         WHERE oid = 'public.guard_profile_authority_fields()'::regprocedure) THEN
    RAISE EXCEPTION 'O gate invocador dos campos de autoridade do perfil não foi instalado.';
  END IF;
END;
$postflight$;

COMMENT ON FUNCTION public.is_gestor_compras(uuid) IS
  'Confirma papel de gestor somente para perfil institucional ativo.';
COMMENT ON FUNCTION public.is_gerente_pa(uuid) IS
  'Confirma papel de gerente somente para perfil institucional ativo.';
COMMENT ON POLICY pa_budgets_active_scope_update_guard ON public.pa_budgets IS
  'Restringe atualização de verba a administração ativa ou gestor da cooperativa do PA.';
COMMENT ON FUNCTION public.guard_profile_authority_fields() IS
  'Impede autoalteração de identidade, vínculo institucional, alçada e estado da conta.';
