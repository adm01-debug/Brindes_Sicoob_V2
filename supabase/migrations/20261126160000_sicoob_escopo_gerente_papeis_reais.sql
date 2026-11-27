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
--   - `supervisor` segue privilegiado onde o dado e operacional (auditoria,
--     configuracoes, RPCs), agora pelo papel real via has_role. Em
--     `order_comments` nao ha privilegio amplo: o comentario herda o escopo de
--     `orders`, entao supervisor ve comentario dos pedidos da propria
--     organizacao e dos pedidos sem organizacao.
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
--   - A RPC de gravacao aceita `is_supervisor_or_above`; a leitura de
--     `pa_notification_settings` passa a aceitar o mesmo conjunto, para a tela
--     nunca abrir vazia para quem pode gravar.
--   - Na RPC de gravacao, argumento NULL significa "nao mexer" (o navegador manda
--     so o campo alterado) e string vazia significa "limpar".
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
  -- O ramo dos papeis Sicoob era inalcancavel, nao um defeito de proposito:
  -- `order_audit_events.order_id` tem FK para `public.orders`
  -- (20260502174252:309), entao todo UUID que a auditoria guarda e de `orders`.
  -- Nenhum pedido Sicoob grava evento nesta tabela (a timeline usa
  -- `sicoob_orders` e a RPC log_order_audit_event so insere order_id). O ramo
  -- segue valido para o dia em que a auditoria passar a espelhar sicoob_orders,
  -- e o simulador prova que ele nao vaza nada hoje.
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
-- O comentario herda o escopo do pedido: `order_comments.order_id` tem FK para
-- `public.orders` (20260502174252:207), entao a leitura espelha `orders_select_scope`
-- (20260426125603:105). O ramo anterior liberava tudo para `is_supervisor_or_above`,
-- inclusive comentarios de pedidos de outra organizacao.
DROP POLICY IF EXISTS "order_comments_select_scoped" ON public.order_comments;
CREATE POLICY "order_comments_select_scoped"
ON public.order_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
     WHERE o.id = order_comments.order_id
       AND (
         public.can_view_all_sales()
         OR (public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
             AND (o.organization_id IS NULL
                  OR o.organization_id IN (SELECT public.get_user_org_ids((SELECT auth.uid())))))
         OR o.seller_id = (SELECT auth.uid())
       )
  )
);

-- =====================================================
-- 5) limit_increase_requests (tela /pa/verba)
-- =====================================================
-- Escopo por PA, nao por cooperativa: user_can_access_pa() libera todos os postos
-- da cooperativa do usuario, o que expunha justificativa e valores dos pedidos de
-- outros postos para qualquer papel vinculado (inclusive gerente de outro PA).
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
-- 6) pa_notification_settings (consolidada: soma-se uma policy de escopo)
-- =====================================================
DROP POLICY IF EXISTS "sicoob_pa_notification_settings_escopo_gerencial" ON public.pa_notification_settings;
CREATE POLICY "sicoob_pa_notification_settings_escopo_gerencial"
ON public.pa_notification_settings FOR SELECT TO authenticated
USING (
  -- Quem grava pela RPC (`is_supervisor_or_above`) precisa ler a mesma linha:
  -- sem isso o supervisor abria a tela vazia e regravava valores neutros.
  public.is_supervisor_or_above((SELECT auth.uid()))
  OR (public.is_gerente_pa() AND pa_id = public.current_user_pa_id())
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

-- A policy permissiva herdada `Admins can manage notification settings`
-- (20260504214012) e FOR ALL e nao olha o segundo fator: uma sessao de senha
-- so (AAL1) escrevia a tabela direto pela API, por fora da tela e da RPC. O
-- papel `admin` continua com politica de escrita, agora atrelada ao mesmo
-- `aal2` que AdminRoute exige.
DROP POLICY IF EXISTS "Admins can manage notification settings"
  ON public.pa_notification_settings;
CREATE POLICY "Admins can manage notification settings"
ON public.pa_notification_settings FOR ALL TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
  AND (SELECT auth.jwt()) ->> 'aal' = 'aal2'
)
WITH CHECK (
  public.is_admin((SELECT auth.uid()))
  AND (SELECT auth.jwt()) ->> 'aal' = 'aal2'
);

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
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Somente a administracao consulta o webhook do Slack.';
  END IF;

  -- O segredo so sai do banco para sessao com segundo fator concluido, como
  -- ja ocorre em sicoob_centrais: a RPC e SECURITY DEFINER e nao herda o
  -- filtro de policy, entao a exigencia precisa estar aqui.
  IF COALESCE((SELECT auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Conclua a verificacao em duas etapas para consultar o webhook do Slack.';
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

-- =====================================================
-- 8) pa_notification_settings: a gravacao tambem passa por RPC
-- =====================================================
-- Por que existe:
--   Com `webhook_url` fora do GRANT de coluna de `authenticated`, o upsert do
--   PostgREST (`INSERT ... ON CONFLICT DO UPDATE`) falha: o PostgreSQL exige
--   SELECT na coluna lida pela expressao de `DO UPDATE`, mesmo quando o valor
--   chega por `EXCLUDED.webhook_url`. Ou seja, revogar a leitura sem mover a
--   escrita quebraria o salvamento dos dois canais (inclusive o de e-mail, que
--   manda `webhook_url: null`).
--   A gravacao passa a ser esta RPC SECURITY DEFINER, que valida o papel e
--   escreve as colunas que o navegador nao pode ler. E o unico caminho de
--   escrita da tela (`NotificationSettingsTab`).
CREATE OR REPLACE FUNCTION public.sicoob_pa_notification_settings_set(
  p_pa_id uuid,
  p_channel text,
  p_webhook_url text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Somente a administracao grava as configuracoes de notificacao.';
  END IF;

  -- Mesma exigencia de segundo fator da leitura do segredo.
  IF COALESCE((SELECT auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Conclua a verificacao em duas etapas para alterar as configuracoes de notificacao.';
  END IF;

  IF p_channel NOT IN ('slack', 'email') THEN
    RAISE EXCEPTION USING ERRCODE='22023',
      MESSAGE='Canal de notificacao invalido: use slack ou email.';
  END IF;

  IF p_pa_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = p_pa_id) THEN
    RAISE EXCEPTION USING ERRCODE='23503',
      MESSAGE='PA inexistente para a configuracao de notificacao.';
  END IF;

  INSERT INTO public.pa_notification_settings (pa_id, channel, webhook_url, recipient_email, is_active)
  VALUES (p_pa_id, p_channel, p_webhook_url, p_recipient_email, COALESCE(p_is_active, false))
  ON CONFLICT (pa_id, channel) DO UPDATE
    -- Preservar o que nao veio no payload: o navegador manda so o campo alterado
    -- (ligar/desligar o canal nao pode apagar o destino ja gravado). NULL = "nao
    -- mexer"; string vazia = "limpar".
    SET webhook_url = COALESCE(EXCLUDED.webhook_url, public.pa_notification_settings.webhook_url),
        recipient_email = COALESCE(EXCLUDED.recipient_email, public.pa_notification_settings.recipient_email),
        is_active = COALESCE(p_is_active, public.pa_notification_settings.is_active);
END;
$function$;

REVOKE ALL ON FUNCTION public.sicoob_pa_notification_settings_set(uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_pa_notification_settings_set(uuid, text, text, text, boolean) TO authenticated, service_role;
