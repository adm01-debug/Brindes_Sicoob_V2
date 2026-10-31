-- Consolida políticas RLS permissivas sobrepostas sem ampliar o acesso.
--
-- O Postgres combina políticas permissivas com OR. A migração preserva essa
-- semântica por operação e por papel, mas materializa uma única política
-- permissiva TO public para cada combinação tabela/operação. O papel original
-- continua sendo exigido dentro da expressão por pg_has_role(). Políticas
-- restritivas não são alteradas e continuam sendo combinadas com AND.

CREATE TEMP TABLE _sicoob_rls_target_tables (
  table_name name PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO _sicoob_rls_target_tables (table_name)
VALUES
  ('admin_config_audit'),
  ('ai_usage_logs'),
  ('ai_usage_quotas'),
  ('blog_posts'),
  ('cms_banners'),
  ('cms_config'),
  ('cms_sections'),
  ('collection_items'),
  ('collections'),
  ('component_media'),
  ('cooperativas'),
  ('custom_kits'),
  ('export_audit_log'),
  ('favorite_item_reactions'),
  ('favorite_items'),
  ('favorite_lists'),
  ('mcp_full_grantors'),
  ('newsletter_subscribers'),
  ('notification_channels'),
  ('order_audit_events'),
  ('order_invoices'),
  ('order_logistics'),
  ('order_payments'),
  ('pa_budgets'),
  ('pa_category_thresholds'),
  ('pa_notification_settings'),
  ('pa_singularidades'),
  ('password_reset_requests'),
  ('permissions'),
  ('pontos_atendimento'),
  ('portfolio_items'),
  ('postos_atendimento'),
  ('product_categories'),
  ('product_component_location_techniques'),
  ('product_component_locations'),
  ('product_components'),
  ('product_group_components'),
  ('product_group_location_techniques'),
  ('product_group_locations'),
  ('product_group_members'),
  ('product_groups'),
  ('product_views'),
  ('profiles'),
  ('qa_release_evidences'),
  ('qa_releases'),
  ('qa_run_steps'),
  ('quote_audit_logs'),
  ('quote_comments'),
  ('quote_templates'),
  ('quotes'),
  ('role_permissions'),
  ('seller_discount_limits'),
  ('sicoob_manager_audit'),
  ('sicoob_orders'),
  ('sicoob_rls_audit_logs'),
  ('step_up_audit_log'),
  ('system_settings'),
  ('telemetry_events'),
  ('telemetry_logs'),
  ('user_comparisons'),
  ('user_roles'),
  ('video_variant_links'),
  ('voice_command_logs'),
  ('workspace_notifications');

CREATE TEMP TABLE _sicoob_rls_policy_snapshot ON COMMIT DROP AS
SELECT
  policy.schemaname,
  policy.tablename,
  policy.policyname,
  policy.roles,
  policy.cmd,
  policy.qual,
  policy.with_check,
  CASE
    WHEN 'public'::name = ANY (policy.roles) THEN 'true'
    ELSE (
      SELECT '(' || string_agg(
        format('pg_has_role(current_user, %L, %L)', role_name::text, 'member'),
        ' OR ' ORDER BY role_name::text
      ) || ')'
      FROM unnest(policy.roles) AS role_name
    )
  END AS role_guard,
  COALESCE(policy.qual, 'true') AS using_expression,
  COALESCE(policy.with_check, policy.qual, 'true') AS check_expression
FROM pg_policies AS policy
JOIN _sicoob_rls_target_tables AS target
  ON target.table_name = policy.tablename
WHERE policy.schemaname = 'public'
  AND policy.permissive = 'PERMISSIVE';

DO $preflight$
DECLARE
  target_count integer;
  policy_count integer;
BEGIN
  SELECT count(*) INTO target_count FROM _sicoob_rls_target_tables;
  SELECT count(*) INTO policy_count FROM _sicoob_rls_policy_snapshot;

  IF target_count <> 64 THEN
    RAISE EXCEPTION 'Lista RLS inesperada: esperadas 64 tabelas, encontradas %.', target_count;
  END IF;

  IF policy_count <> 198 THEN
    RAISE EXCEPTION 'Snapshot RLS divergente: esperadas 198 políticas permissivas, encontradas %.', policy_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sicoob_rls_target_tables AS target
    LEFT JOIN pg_class AS relation
      ON relation.oid = to_regclass(format('public.%I', target.table_name))
    WHERE relation.oid IS NULL
      OR relation.relkind NOT IN ('r', 'p')
      OR NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Uma tabela alvo não existe ou está sem RLS; lote cancelado.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sicoob_rls_target_tables AS target
    LEFT JOIN _sicoob_rls_policy_snapshot AS policy
      ON policy.tablename = target.table_name
    GROUP BY target.table_name
    HAVING count(policy.policyname) < 2
  ) THEN
    RAISE EXCEPTION 'Uma tabela alvo deixou de possuir políticas permissivas sobrepostas; lote cancelado.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sicoob_rls_policy_snapshot AS policy
    WHERE NOT policy.roles <@ ARRAY['public', 'anon', 'authenticated', 'service_role']::name[]
  ) THEN
    RAISE EXCEPTION 'Foi encontrado um papel RLS fora do contrato auditado; lote cancelado.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sicoob_rls_policy_snapshot AS policy
    WHERE policy.cmd NOT IN ('ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE')
       OR policy.role_guard IS NULL
  ) THEN
    RAISE EXCEPTION 'Foi encontrada uma política RLS que não pode ser consolidada com segurança.';
  END IF;
END;
$preflight$;

DO $consolidate$
DECLARE
  old_policy record;
  target_table record;
  target_action text;
  using_clause text;
  check_clause text;
  merged_policy_name text;
BEGIN
  FOR old_policy IN
    SELECT schemaname, tablename, policyname
    FROM _sicoob_rls_policy_snapshot
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      old_policy.policyname,
      old_policy.schemaname,
      old_policy.tablename
    );
  END LOOP;

  FOR target_table IN
    SELECT table_name
    FROM _sicoob_rls_target_tables
    ORDER BY table_name
  LOOP
    FOREACH target_action IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM _sicoob_rls_policy_snapshot AS policy
        WHERE policy.tablename = target_table.table_name
          AND policy.cmd IN ('ALL', target_action)
      ) THEN
        CONTINUE;
      END IF;

      merged_policy_name := format(
        'sicoob_merged_%s_%s',
        substr(md5(target_table.table_name::text || ':' || target_action), 1, 16),
        lower(target_action)
      );

      IF target_action IN ('SELECT', 'UPDATE', 'DELETE') THEN
        SELECT string_agg(
          format('(%s AND (%s))', policy.role_guard, policy.using_expression),
          ' OR ' ORDER BY policy.policyname
        )
        INTO using_clause
        FROM _sicoob_rls_policy_snapshot AS policy
        WHERE policy.tablename = target_table.table_name
          AND policy.cmd IN ('ALL', target_action);
      END IF;

      IF target_action IN ('INSERT', 'UPDATE') THEN
        SELECT string_agg(
          format('(%s AND (%s))', policy.role_guard, policy.check_expression),
          ' OR ' ORDER BY policy.policyname
        )
        INTO check_clause
        FROM _sicoob_rls_policy_snapshot AS policy
        WHERE policy.tablename = target_table.table_name
          AND policy.cmd IN ('ALL', target_action);
      END IF;

      CASE target_action
        WHEN 'SELECT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO public USING (%s)',
            merged_policy_name,
            target_table.table_name,
            using_clause
          );
        WHEN 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO public WITH CHECK (%s)',
            merged_policy_name,
            target_table.table_name,
            check_clause
          );
        WHEN 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO public USING (%s) WITH CHECK (%s)',
            merged_policy_name,
            target_table.table_name,
            using_clause,
            check_clause
          );
        WHEN 'DELETE' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO public USING (%s)',
            merged_policy_name,
            target_table.table_name,
            using_clause
          );
      END CASE;
    END LOOP;
  END LOOP;
END;
$consolidate$;

DO $postflight$
DECLARE
  expected_policy_count integer;
  actual_policy_count integer;
BEGIN
  SELECT count(*)
  INTO expected_policy_count
  FROM (
    SELECT DISTINCT policy.tablename, action_name
    FROM _sicoob_rls_policy_snapshot AS policy
    CROSS JOIN LATERAL unnest(
      CASE
        WHEN policy.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
        ELSE ARRAY[policy.cmd]::text[]
      END
    ) AS action_name
  ) AS expected;

  SELECT count(*)
  INTO actual_policy_count
  FROM pg_policies AS policy
  JOIN _sicoob_rls_target_tables AS target
    ON target.table_name = policy.tablename
  WHERE policy.schemaname = 'public'
    AND policy.permissive = 'PERMISSIVE';

  IF expected_policy_count <> 227 OR actual_policy_count <> expected_policy_count THEN
    RAISE EXCEPTION
      'Pós-validação RLS divergente: esperadas % políticas consolidadas, encontradas %.',
      expected_policy_count,
      actual_policy_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies AS policy
    JOIN _sicoob_rls_target_tables AS target
      ON target.table_name = policy.tablename
    WHERE policy.schemaname = 'public'
      AND policy.permissive = 'PERMISSIVE'
      AND (
        policy.roles <> ARRAY['public']::name[]
        OR policy.cmd = 'ALL'
        OR policy.policyname !~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
      )
  ) THEN
    RAISE EXCEPTION 'A forma final das políticas RLS não corresponde ao contrato consolidado.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies AS policy
    JOIN _sicoob_rls_target_tables AS target
      ON target.table_name = policy.tablename
    WHERE policy.schemaname = 'public'
      AND policy.permissive = 'PERMISSIVE'
    GROUP BY policy.tablename, policy.cmd
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Ainda existem políticas permissivas sobrepostas no conjunto consolidado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pa_budgets'
      AND policyname = 'pa_budgets_anon_deny'
      AND permissive = 'RESTRICTIVE'
      AND roles = ARRAY['anon']::name[]
      AND cmd = 'ALL'
      AND qual = 'false'
      AND with_check = 'false'
  ) THEN
    RAISE EXCEPTION 'A política restritiva de pa_budgets foi alterada; lote cancelado.';
  END IF;
END;
$postflight$;
