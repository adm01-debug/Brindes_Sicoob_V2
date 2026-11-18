CREATE OR REPLACE FUNCTION public.check_sicoob_access_matrix(_test_role app_role)
 RETURNS TABLE(tablename text, can_select boolean, can_insert boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
END; $function$
