-- Reconciliação 16/09/2026 — achados da execução exaustiva das Etapas 24 e 27.
--
-- 1) sicoob_order_history (Etapa 27, trilha imutável): tinha UPDATE/DELETE/TRUNCATE
--    concedidos a anon e authenticated. RLS (habilitado, sem policy de UPDATE/DELETE)
--    já bloqueava UPDATE/DELETE por padrão-nega, mas TRUNCATE NÃO é coberto por RLS
--    no Postgres — ficava sem nenhuma proteção real. INSERT (com WITH CHECK
--    auth.uid()=user_id) e SELECT (escopado por sicoob_order_history_select_scoped)
--    permanecem como estavam.
REVOKE UPDATE, DELETE, TRUNCATE ON public.sicoob_order_history FROM anon, authenticated;

-- 2) Views sem security_invoker (Etapa 24) com grants padrão nunca revogados:
--    INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER concedidos a anon e
--    authenticated em todas as 3. telemetry_query_performance é um passthrough
--    de tabela única (SELECT ... FROM query_telemetry, sem join/agregação) — o
--    Postgres considera isso "automaticamente atualizável", ou seja, sem
--    security_invoker um DELETE feito através da view rodaria com o dono da view,
--    ignorando a policy "Devs can delete telemetry" (is_dev()) da tabela base.
--    Confirmado que error-monitor e monthly-health-report (únicos consumidores)
--    usam SUPABASE_SERVICE_ROLE_KEY — não afetados por revogar anon/authenticated.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT
  ON public.v_sicoob_hierarchy, public.sicoob_budget_audit, public.telemetry_query_performance
  FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.v_sicoob_hierarchy, public.sicoob_budget_audit, public.telemetry_query_performance
  FROM authenticated;

ALTER VIEW public.v_sicoob_hierarchy SET (security_invoker = on);
ALTER VIEW public.sicoob_budget_audit SET (security_invoker = on);
ALTER VIEW public.telemetry_query_performance SET (security_invoker = on);
-- Seguro: as tabelas-base (cooperativas, postos_atendimento, sicoob_centrais,
-- sicoob_temas para v_sicoob_hierarchy; pa_budgets/sicoob_orders para
-- sicoob_budget_audit; query_telemetry para telemetry_query_performance) já têm
-- RLS que cobre o acesso legítimo de authenticated — security_invoker apenas
-- passa a respeitá-lo em vez de rodar com o dono da view.
