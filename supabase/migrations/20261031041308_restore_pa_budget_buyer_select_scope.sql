-- Reintroduz o acesso de leitura de comprador_pac e comprador_singular que a
-- consolidação de policies removeu. O guarda restritivo de escopo continua
-- sendo avaliado em conjunto e impede leitura fora de PA/cooperativa ativos.
DO $assert$
DECLARE
  existing_policy pg_catalog.pg_policies%ROWTYPE;
BEGIN
  SELECT *
    INTO existing_policy
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'pa_budgets'
     AND policyname = 'pa_budgets_buyer_select';

  IF NOT FOUND THEN
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

    SELECT *
      INTO existing_policy
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'pa_budgets'
       AND policyname = 'pa_budgets_buyer_select';
  END IF;

  IF existing_policy.cmd <> 'SELECT'
     OR existing_policy.permissive <> 'PERMISSIVE'
     OR NOT ('authenticated'::name = ANY(existing_policy.roles))
     OR COALESCE(existing_policy.qual, '') NOT ILIKE '%comprador_pac%'
     OR COALESCE(existing_policy.qual, '') NOT ILIKE '%current_user_pa_id%'
     OR COALESCE(existing_policy.qual, '') NOT ILIKE '%comprador_singular%'
     OR COALESCE(existing_policy.qual, '') NOT ILIKE '%service_point.is_active%'
     OR COALESCE(existing_policy.qual, '') NOT ILIKE '%current_user_cooperativa_id%' THEN
    RAISE EXCEPTION 'Contrato inválido: policy de compradores ausente ou com escopo inesperado.';
  END IF;
END
$assert$;
