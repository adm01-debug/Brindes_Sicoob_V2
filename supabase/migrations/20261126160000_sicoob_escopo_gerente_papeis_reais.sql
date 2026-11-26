-- =====================================================
-- SIC-011: escopo gerencial passa a provar o papel real e o vinculo correto
-- =====================================================
-- Por que existe:
--   As policies de escopo por PA/Singular (20260503195511, 20260504214012 e
--   20260522200433) provam o papel por `profiles.role` com o vocabulario
--   antigo (`gestor_pa`/`gestor_singular`) e juntam o perfil por
--   `p.id = auth.uid()`. `profiles.id` e o id da ficha; a conta fica em
--   `profiles.user_id`. A juncao nao casa para nenhuma conta, entao o EXISTS
--   nunca e verdadeiro e a clausula fica morta: quem nao e admin/dev nao ve
--   auditoria, comentarios, historico, logs de itens, solicitacoes de alcada
--   nem as configuracoes de notificacao do proprio PA.
--   O papel real vive em `public.user_roles` (e de la que has_role,
--   is_gerente_pa e is_gestor_compras leem); `profiles.role` recebeu
--   `user_roles.role::text` em 20260326193116, ou seja, `gerente_pa` e
--   `gestor_compras`, que nao batem com o vocabulario antigo.
-- O que faz:
--   Prova o papel pelos helpers oficiais (is_gerente_pa, is_gestor_compras,
--   has_role, user_can_access_pa, todos SECURITY DEFINER com ACL fechada) e o
--   vinculo por current_user_pa_id()/current_user_cooperativa_id().
--   `limit_increase_requests.requested_by` passa a ser exigido, para o
--   solicitante ver o proprio pedido.
-- Decisoes:
--   - `supervisor` segue privilegiado (o comentario original dizia
--     "Privileged roles"), agora pelo papel real via has_role. `logistics` sai:
--     nao existe em `app_role` e nunca pode ser concedido.
--   - Solicitar aumento de alcada passa a exigir acesso ao PA
--     (user_can_access_pa), que e o que a tela /pa/verba oferece; antes a
--     policy nao deixava ninguem inserir. A aprovacao continua nas RPCs.
--   - `order_audit_events` e `pa_notification_settings` tiveram as policies
--     consolidadas em 20261007233000 (nomes `sicoob_merged_*`), que o contrato
--     do aplicador exige manter. Nelas a correcao entra como policy permissiva
--     adicional: a consolidada continua valida e cobre o ramo admin.
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE POLICY.

-- =====================================================
-- 1) order_audit_events (consolidada: soma-se uma policy de escopo)
-- =====================================================
DROP POLICY IF EXISTS "sicoob_order_audit_events_escopo_gerencial" ON public.order_audit_events;
CREATE POLICY "sicoob_order_audit_events_escopo_gerencial"
ON public.order_audit_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
     WHERE o.id = order_audit_events.order_id
       AND (o.seller_id = (SELECT auth.uid())
            OR o.organization_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))))
  )
  OR EXISTS (
    SELECT 1 FROM public.sicoob_orders so
     WHERE so.id = order_audit_events.order_id
       AND (
         so.created_by = (SELECT auth.uid())
         OR (public.is_gerente_pa() AND so.pa_id = public.current_user_pa_id())
         OR (public.is_gestor_compras() AND so.cooperative_id = public.current_user_cooperativa_id())
         OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
       )
  )
);

-- =====================================================
-- 2) order_comments
-- =====================================================
DROP POLICY IF EXISTS "order_comments_select_scoped" ON public.order_comments;
CREATE POLICY "order_comments_select_scoped"
ON public.order_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
     WHERE o.id = order_comments.order_id
       AND (o.seller_id = (SELECT auth.uid())
            OR o.organization_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))))
  )
  OR EXISTS (
    SELECT 1 FROM public.sicoob_orders so
     WHERE so.id = order_comments.order_id
       AND (
         so.created_by = (SELECT auth.uid())
         OR (public.is_gerente_pa() AND so.pa_id = public.current_user_pa_id())
         OR (public.is_gestor_compras() AND so.cooperative_id = public.current_user_cooperativa_id())
         OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
       )
  )
);

-- =====================================================
-- 3) sicoob_order_history
-- =====================================================
DROP POLICY IF EXISTS "sicoob_order_history_select_scoped" ON public.sicoob_order_history;
CREATE POLICY "sicoob_order_history_select_scoped"
ON public.sicoob_order_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders so
     WHERE so.id = sicoob_order_history.order_id
       AND (
         so.created_by = (SELECT auth.uid())
         OR (public.is_gerente_pa() AND so.pa_id = public.current_user_pa_id())
         OR (public.is_gestor_compras() AND so.cooperative_id = public.current_user_cooperativa_id())
         OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
       )
  )
);

-- =====================================================
-- 4) sicoob_order_item_logs
-- =====================================================
DROP POLICY IF EXISTS "sicoob_order_item_logs_select_scoped" ON public.sicoob_order_item_logs;
CREATE POLICY "sicoob_order_item_logs_select_scoped"
ON public.sicoob_order_item_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders so
     WHERE so.id = sicoob_order_item_logs.order_id
       AND (
         so.created_by = (SELECT auth.uid())
         OR (public.is_gerente_pa() AND so.pa_id = public.current_user_pa_id())
         OR (public.is_gestor_compras() AND so.cooperative_id = public.current_user_cooperativa_id())
         OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
       )
  )
);

-- =====================================================
-- 5) limit_increase_requests (tela /pa/verba)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own PA limit requests" ON public.limit_increase_requests;
CREATE POLICY "Users can view their own PA limit requests"
ON public.limit_increase_requests FOR SELECT TO authenticated
USING (
  public.user_can_access_pa(pa_id)
  OR requested_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "PA Managers can insert limit requests" ON public.limit_increase_requests;
CREATE POLICY "PA Managers can insert limit requests"
ON public.limit_increase_requests FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_pa(pa_id)
  AND requested_by = (SELECT auth.uid())
);

-- =====================================================
-- 6) pa_notification_settings (consolidada: soma-se uma policy de escopo)
-- =====================================================
DROP POLICY IF EXISTS "sicoob_pa_notification_settings_escopo_gerencial" ON public.pa_notification_settings;
CREATE POLICY "sicoob_pa_notification_settings_escopo_gerencial"
ON public.pa_notification_settings FOR SELECT TO authenticated
USING (
  (public.is_gerente_pa() AND pa_id = public.current_user_pa_id())
  OR (public.is_gestor_compras() AND EXISTS (
        SELECT 1 FROM public.postos_atendimento pa
         WHERE pa.id = pa_notification_settings.pa_id
           AND pa.cooperativa_id = public.current_user_cooperativa_id()
      ))
);