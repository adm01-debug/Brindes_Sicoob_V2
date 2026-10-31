-- Reintroduz o acesso de leitura de comprador_pac e comprador_singular que a
-- consolidação de policies removeu. O guarda restritivo de escopo continua
-- sendo avaliado em conjunto e impede leitura fora de PA/cooperativa ativos.
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

DO $assert$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pa_budgets'
      AND policyname = 'pa_budgets_buyer_select'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
      AND 'authenticated'::name = ANY(roles)
      AND qual ILIKE '%comprador_singular%'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: leitura de verba por comprador singular não foi restaurada.';
  END IF;
END
$assert$;
