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
--   - Historico e logs de itens saem deste PR: a consolidacao de 20260927193000
--     ja le por sicoob_current_actor_can_read_order, que cobre created_by, admin,
--     manager, dev, supervisor, gestor_compras da cooperativa, gerente_pa do PA e
--     delegacao ativa, ainda checando is_active/deleted_at do perfil. Recriar as
--     policies aqui so afrouxaria a guarda, entao elas nao sao tocadas.
--   - `pa_notification_settings.webhook_url` e credencial de publicacao no Slack:
--     a coluna sai do GRANT de `authenticated` e passa a ser lida pela RPC
--     sicoob_pa_slack_webhook, restrita a administracao. O dispatcher da outbox
--     (20260922210000/20260922225300) le a coluna por funcao SECURITY DEFINER e
--     nao e afetado.
--   - `limit_increase_requests` aceita apenas insercao pendente e sem aprovador:
--     quem solicita nao escolhe o proprio veredito; aprovar segue nas RPCs.
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
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
  OR EXISTS (
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
  AND status = 'pending'
  AND approved_by IS NULL
  AND rejection_reason IS NULL
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

-- =====================================================
-- 7) pa_notification_settings: a URL secreta do Slack nao vai para o navegador
-- =====================================================
-- O GRANT de tabela e por papel, e o gerente usa o mesmo papel `authenticated`
-- do admin: para dar leitura de canal/estado ao gerente sem entregar a
-- credencial, o acesso passa a ser por coluna.
REVOKE SELECT ON public.pa_notification_settings FROM authenticated, anon;
GRANT SELECT (id, pa_id, channel, recipient_email, is_active, created_at)
  ON public.pa_notification_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.sicoob_pa_slack_webhook(p_pa_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_url text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Somente a administracao consulta o webhook do Slack.';
  END IF;

  SELECT s.webhook_url INTO v_url
    FROM public.pa_notification_settings s
   WHERE s.pa_id = p_pa_id
     AND s.channel = 'slack'
   LIMIT 1;

  RETURN v_url;
END;
$function$;

REVOKE ALL ON FUNCTION public.sicoob_pa_slack_webhook(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_pa_slack_webhook(uuid) TO authenticated, service_role;
