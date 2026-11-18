CREATE OR REPLACE FUNCTION public.audit_rls_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
