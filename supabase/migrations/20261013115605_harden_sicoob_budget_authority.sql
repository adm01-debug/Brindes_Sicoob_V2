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
);

-- Consumo e estorno de verba pertencem às rotinas transacionais de pedido,
-- executadas com privilégio de servidor. Clientes autenticados só podem
-- alocar a verba e sua alçada; nunca escrever o saldo consumido diretamente.
REVOKE ALL ON TABLE public.pa_budgets FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.pa_budgets FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.pa_budgets TO authenticated;
GRANT INSERT (pa_id, ano, mes, verba_total, limite_alcada, observacoes)
  ON public.pa_budgets TO authenticated;
GRANT UPDATE (verba_total, limite_alcada, observacoes)
  ON public.pa_budgets TO authenticated;

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
END;
$postflight$;

COMMENT ON FUNCTION public.is_gestor_compras(uuid) IS
  'Confirma papel de gestor somente para perfil institucional ativo.';
COMMENT ON FUNCTION public.is_gerente_pa(uuid) IS
  'Confirma papel de gerente somente para perfil institucional ativo.';
COMMENT ON POLICY pa_budgets_active_scope_update_guard ON public.pa_budgets IS
  'Restringe atualização de verba a administração ativa ou gestor da cooperativa do PA.';
