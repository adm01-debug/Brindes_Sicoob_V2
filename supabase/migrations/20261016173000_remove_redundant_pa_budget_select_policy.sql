-- A policy restritiva pa_budgets_active_scope_select_guard já limita os
-- compradores ao mesmo escopo. A policy permissiva consolidada cobre esse
-- ramo; manter pa_budgets_buyer_select duplica avaliação por linha.

DROP POLICY IF EXISTS pa_budgets_buyer_select ON public.pa_budgets;

DO $assert$
BEGIN
  IF (
    SELECT count(*)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pa_budgets'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
      AND 'authenticated'::name = ANY(roles)
  ) <> 1 THEN
    RAISE EXCEPTION 'Contrato inválido: pa_budgets deve ter uma única policy SELECT permissiva.';
  END IF;
END
$assert$;
