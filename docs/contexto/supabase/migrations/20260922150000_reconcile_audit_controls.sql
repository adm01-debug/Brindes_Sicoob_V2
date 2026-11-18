-- Correções aditivas dos controles verificados em 22/09/2026.
-- Validar em transação no banco de construção antes de registrar no ledger.
CREATE OR REPLACE FUNCTION public.assert_database_auditor()
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND (
    auth.uid() IS NULL OR NOT (COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
      OR COALESCE(public.has_role(auth.uid(), 'dev'::public.app_role), false))
  ) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Auditoria restrita à administração.'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.assert_database_auditor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_database_auditor() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_rls_matrix()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_database_auditor();

  WITH crit_tables AS (
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('seller_id','user_id','owner_id','created_by','assigned_to')
  ),
  rls AS (
    SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND n.nspname = 'public'
  ),
  ops AS (
    SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS op
  ),
  pol_per_op AS (
    -- Expande policies "ALL" para as 4 operações
    SELECT p.tablename, op.op AS cmd,
           p.policyname, p.qual, p.with_check, p.permissive, p.roles
    FROM pg_policies p
    CROSS JOIN ops op
    WHERE p.schemaname = 'public'
      AND (p.cmd = op.op OR p.cmd = 'ALL')
  ),
  agg AS (
    SELECT tablename, cmd,
      jsonb_agg(jsonb_build_object(
        'name', policyname,
        'qual', COALESCE(qual::text,''),
        'with_check', COALESCE(with_check::text,''),
        'permissive', permissive,
        'roles', roles
      ) ORDER BY policyname) AS policies,
      string_agg(DISTINCT COALESCE(qual::text,''), ' || ' ORDER BY COALESCE(qual::text,'')) AS quals_concat
    FROM pol_per_op
    GROUP BY tablename, cmd
  ),
  matrix AS (
    SELECT
      t.table_name,
      r.rls_enabled,
      o.op,
      a.policies,
      a.quals_concat,
      (a.policies IS NULL) AS missing
    FROM crit_tables t
    LEFT JOIN rls r ON r.table_name = t.table_name
    CROSS JOIN ops o
    LEFT JOIN agg a ON a.tablename = t.table_name AND a.cmd = o.op
  ),
  -- Detecta divergência: o predicado de SELECT é diferente do de UPDATE/DELETE
  divergence AS (
    SELECT m.table_name,
      max(m.quals_concat) FILTER (WHERE m.op = 'SELECT') AS sel_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'UPDATE') AS upd_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'DELETE') AS del_q
    FROM matrix m
    GROUP BY m.table_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', m.table_name,
    'rls_enabled', COALESCE(m.rls_enabled,false),
    'operation', m.op,
    'missing', m.missing,
    'policy_count', COALESCE(jsonb_array_length(m.policies),0),
    'policies', COALESCE(m.policies,'[]'::jsonb),
    'criterion_diverges',
      CASE
        WHEN m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q THEN true
        WHEN m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q THEN true
        ELSE false
      END,
    'severity',
      CASE
        WHEN NOT COALESCE(m.rls_enabled,false) THEN 'critical'
        WHEN m.missing AND m.op = 'SELECT' THEN 'high'
        WHEN m.missing THEN 'medium'
        WHEN ((m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q)
           OR (m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q)) THEN 'review'
        ELSE 'ok'
      END
  ) ORDER BY m.table_name,
       CASE m.op WHEN 'SELECT' THEN 1 WHEN 'INSERT' THEN 2 WHEN 'UPDATE' THEN 3 ELSE 4 END
  ), '[]'::jsonb)
  INTO v_result
  FROM matrix m
  LEFT JOIN divergence d ON d.table_name = m.table_name;

  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION public.audit_rls_coverage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_database_auditor();
  RETURN (WITH t AS (
    SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND n.nspname = 'public'
  ),
  cols AS (
    SELECT table_schema, table_name,
      bool_or(column_name IN ('seller_id','user_id','owner_id','created_by','assigned_to')) AS is_owned
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_schema, table_name
  ),
  pol AS (
    SELECT schemaname AS schema, tablename AS table_name,
      bool_or(cmd IN ('SELECT','ALL')) AS has_select,
      bool_or(cmd IN ('INSERT','ALL')) AS has_insert,
      bool_or(cmd IN ('UPDATE','ALL')) AS has_update,
      bool_or(cmd IN ('DELETE','ALL')) AS has_delete,
      count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ),
  base AS (
    SELECT t.table_name, t.rls_enabled,
      COALESCE(pol.has_select,false) AS has_select,
      COALESCE(pol.has_insert,false) AS has_insert,
      COALESCE(pol.has_update,false) AS has_update,
      COALESCE(pol.has_delete,false) AS has_delete,
      COALESCE(pol.policy_count,0) AS policy_count
    FROM t
    JOIN cols ON cols.table_schema = t.schema AND cols.table_name = t.table_name AND cols.is_owned
    LEFT JOIN pol ON pol.schema = t.schema AND pol.table_name = t.table_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', table_name,
    'rls_enabled', rls_enabled,
    'policy_count', policy_count,
    'has_select', has_select,
    'has_insert', has_insert,
    'has_update', has_update,
    'has_delete', has_delete,
    'missing_ops', (
      ARRAY_REMOVE(ARRAY[
        CASE WHEN NOT has_select THEN 'SELECT' END,
        CASE WHEN NOT has_insert THEN 'INSERT' END,
        CASE WHEN NOT has_update THEN 'UPDATE' END,
        CASE WHEN NOT has_delete THEN 'DELETE' END
      ], NULL)
    ),
    'severity', CASE
      WHEN NOT rls_enabled THEN 'critical'
      WHEN NOT has_select THEN 'high'
      WHEN (NOT has_insert) OR (NOT has_update) OR (NOT has_delete) THEN 'medium'
      ELSE 'ok'
    END
  ) ORDER BY
    (NOT rls_enabled) DESC,
    (NOT has_select) DESC,
    table_name
  ), '[]'::jsonb)
  FROM base
  WHERE NOT rls_enabled
     OR NOT has_select OR NOT has_insert OR NOT has_update OR NOT has_delete);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_tables_rls()
RETURNS TABLE (schemaname text, relname text, relrowsecurity boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  PERFORM public.assert_database_auditor();
  RETURN QUERY SELECT n.nspname::text, c.relname::text, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname;
END; $$;

-- Cobertura de policies por operação; não simula os predicados de uma pessoa.
CREATE OR REPLACE FUNCTION public.check_sicoob_access_matrix(_test_role public.app_role)
RETURNS TABLE(tablename text, can_select boolean, can_insert boolean, can_update boolean, can_delete boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  PERFORM public.assert_database_auditor();
  RETURN QUERY SELECT t.table_name::text,
    COALESCE(bool_or(p.cmd IN ('SELECT', 'ALL')), false),
    COALESCE(bool_or(p.cmd IN ('INSERT', 'ALL')), false),
    COALESCE(bool_or(p.cmd IN ('UPDATE', 'ALL')), false),
    COALESCE(bool_or(p.cmd IN ('DELETE', 'ALL')), false)
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.schemaname = t.table_schema AND p.tablename = t.table_name
    AND p.roles && ARRAY[_test_role::name, 'public'::name, 'authenticated'::name]
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    AND t.table_name IN ('cooperativas','pa_budgets','sicoob_orders','sicoob_order_items','sicoob_order_history')
  GROUP BY t.table_name ORDER BY t.table_name;
END; $$;

REVOKE ALL ON FUNCTION public.audit_rls_matrix() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_rls_matrix() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_rls_coverage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_rls_coverage() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_tables_rls() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_tables_rls() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_sicoob_access_matrix(public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_sicoob_access_matrix(public.app_role) TO service_role;

-- Expõe somente o email do próprio usuário, de auditor dev ou do servidor.
-- Não concede SELECT de auth.users aos consumidores da view.
CREATE OR REPLACE FUNCTION public.audit_actor_email(p_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND (
    auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM p_user_id
      AND NOT COALESCE(public.is_dev(auth.uid()), false))
  ) THEN RETURN NULL; END IF;
  RETURN (SELECT u.email::text FROM auth.users u WHERE u.id = p_user_id);
END; $$;
REVOKE ALL ON FUNCTION public.audit_actor_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_actor_email(uuid) TO authenticated, service_role;
CREATE OR REPLACE VIEW public.v_full_scope_grants AS
SELECT
  sual.id                                              AS audit_id,
  sual.created_at                                      AS granted_at,
  sual.user_id                                         AS granted_to_user_id,
  p.full_name                                          AS granted_to_name,
  public.audit_actor_email(sual.user_id)::varchar(255) AS granted_to_email,
  sual.action                                          AS step_up_action,
  (sual.metadata->>'operation')                        AS operation,
  (sual.metadata->>'key_id')::uuid                     AS key_id,
  (sual.metadata->>'key_prefix')                       AS key_prefix,
  (sual.metadata->>'expires_at')::timestamptz          AS key_expires_at,
  (sual.metadata->>'justification')                    AS justification,
  sual.challenge_id,
  sual.token_id,
  sual.ip_address,
  sual.user_agent,
  (sual.metadata->>'request_id')                       AS request_id,
  (sual.metadata->'verifications')                     AS verifications_applied,
  (sual.metadata->'extra')                             AS extra
FROM public.step_up_audit_log sual
LEFT JOIN public.profiles p ON p.user_id = sual.user_id
WHERE sual.event_type = 'full_scope_granted';

COMMENT ON VIEW public.v_full_scope_grants IS
'Histórico completo de concessões de FULL scope (chaves MCP com escopo *). Restringida via RLS herdada de step_up_audit_log: apenas dev ou o próprio usuário.';

-- security_invoker faz a view respeitar as policies RLS de step_up_audit_log
ALTER VIEW public.v_full_scope_grants SET (security_invoker = on);
REVOKE ALL ON public.v_full_scope_grants FROM PUBLIC, anon;
GRANT SELECT ON public.v_full_scope_grants TO authenticated, service_role;
