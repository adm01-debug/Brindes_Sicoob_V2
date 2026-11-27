-- Escopo por PA, nao por cooperativa: `user_can_access_pa()` libera todos os
-- postos da cooperativa do usuario, o que expunha justificativa e valores dos
-- pedidos de verba de outros postos para qualquer papel vinculado (inclusive
-- gerente de outro PA, que via a justificativa dos pedidos alheios da mesma
-- cooperativa pelo PostgREST).
--
-- Esta migration substitui apenas as duas policies de `limit_increase_requests`.
-- A migration 20261126160000 ja esta mesclada e nao pode ser editada: o arquivo
-- alterado nao e reaplicado no banco e cria drift com o schema real.

DROP POLICY IF EXISTS "Users can view their own PA limit requests" ON public.limit_increase_requests;
CREATE POLICY "Users can view their own PA limit requests"
ON public.limit_increase_requests FOR SELECT TO authenticated
USING (
  requested_by = (SELECT auth.uid())
  OR public.is_admin((SELECT auth.uid()))
  OR (
    public.has_role((SELECT auth.uid()), 'gerente_pa'::public.app_role)
    AND limit_increase_requests.pa_id = public.current_user_pa_id()
  )
  OR (
    (
      public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'comprador_singular'::public.app_role)
    )
    AND EXISTS (
      SELECT 1
        FROM public.postos_atendimento AS service_point
       WHERE service_point.id = limit_increase_requests.pa_id
         AND service_point.is_active IS TRUE
         AND service_point.cooperativa_id = public.current_user_cooperativa_id()
    )
  )
);

DROP POLICY IF EXISTS "PA Managers can insert limit requests" ON public.limit_increase_requests;
CREATE POLICY "PA Managers can insert limit requests"
ON public.limit_increase_requests FOR INSERT TO authenticated
WITH CHECK (
  limit_increase_requests.requested_by = (SELECT auth.uid())
  AND limit_increase_requests.status = 'pending'
  AND limit_increase_requests.approved_by IS NULL
  AND limit_increase_requests.rejection_reason IS NULL
  AND (
    public.is_admin((SELECT auth.uid()))
    OR limit_increase_requests.pa_id = public.current_user_pa_id()
    OR (
      (
        public.has_role((SELECT auth.uid()), 'gestor_compras'::public.app_role)
        OR public.has_role((SELECT auth.uid()), 'comprador_singular'::public.app_role)
      )
      AND EXISTS (
        SELECT 1
          FROM public.postos_atendimento AS service_point
         WHERE service_point.id = limit_increase_requests.pa_id
           AND service_point.is_active IS TRUE
           AND service_point.cooperativa_id = public.current_user_cooperativa_id()
      )
    )
  )
);

-- =====================================================
-- Reversao (Down) — nao executada automaticamente
-- =====================================================
-- Desfazer e recriar as duas policies com o texto vigente ANTES desta
-- migration, que nao e o historico antigo de `profiles.role`: e o bloco 5 de
-- 20261126160000_sicoob_escopo_gerente_papeis_reais.sql (l.114-140), que ja
-- usava user_can_access_pa() mais o papel. Reaplicar o texto de antes da
-- 20261126160000 devolveria o vazamento para outro PA da mesma cooperativa.
--
-- Ordem de reversao: o front pode voltar a usar o filtro por PA antes do
-- banco; o contrario (banco primeiro) nao quebra a tela, so afrouxa a leitura.
--
--   DROP POLICY IF EXISTS "Users can view their own PA limit requests" ON public.limit_increase_requests;
--   CREATE POLICY "Users can view their own PA limit requests"
--   ON public.limit_increase_requests FOR SELECT TO authenticated
--   USING (
--     public.user_can_access_pa(pa_id)
--     AND (
--       public.has_role((SELECT auth.uid()), 'gerente_pa'::public.app_role)
--       OR requested_by = (SELECT auth.uid())
--     )
--   );
--
--   DROP POLICY IF EXISTS "PA Managers can insert limit requests" ON public.limit_increase_requests;
--   CREATE POLICY "PA Managers can insert limit requests"
--   ON public.limit_increase_requests FOR INSERT TO authenticated
--   WITH CHECK (
--     public.user_can_access_pa(pa_id)
--     AND requested_by = (SELECT auth.uid())
--     AND status = 'pending'
--     AND approved_by IS NULL
--     AND rejection_reason IS NULL
--   );
