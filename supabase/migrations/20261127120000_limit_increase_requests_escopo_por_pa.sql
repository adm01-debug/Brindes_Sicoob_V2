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
