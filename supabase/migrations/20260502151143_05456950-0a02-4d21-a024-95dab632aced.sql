-- Função para testar acesso simulado (dry-run) para matriz de auditoria Sicoob
CREATE OR REPLACE FUNCTION public.check_sicoob_access_matrix(_test_role app_role)
RETURNS TABLE (
  tablename text,
  can_select boolean,
  can_insert boolean,
  can_update boolean,
  can_delete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta função é para auditoria administrativa
  IF auth.uid() IS NOT NULL AND NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev')) THEN
    RAISE EXCEPTION 'Acesso negado para auditoria RLS';
  END IF;

  RETURN QUERY
  SELECT 
    t.table_name::text,
    EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.table_name AND (p.roles @> ARRAY[_test_role::name] OR p.roles @> ARRAY['public'] OR p.roles @> ARRAY['authenticated'])) as can_select,
    EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.table_name AND p.cmd = 'INSERT' AND (p.roles @> ARRAY[_test_role::name] OR p.roles @> ARRAY['public'] OR p.roles @> ARRAY['authenticated'])) as can_insert,
    EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.table_name AND p.cmd = 'UPDATE' AND (p.roles @> ARRAY[_test_role::name] OR p.roles @> ARRAY['public'] OR p.roles @> ARRAY['authenticated'])) as can_update,
    EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.table_name AND p.cmd = 'DELETE' AND (p.roles @> ARRAY[_test_role::name] OR p.roles @> ARRAY['public'] OR p.roles @> ARRAY['authenticated'])) as can_delete
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
    AND t.table_name IN ('cooperativas', 'pa_budgets', 'sicoob_orders', 'sicoob_order_items', 'sicoob_order_history');
END;
$$;

-- Revogar execução pública da função de auditoria
REVOKE EXECUTE ON FUNCTION public.check_sicoob_access_matrix(app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_sicoob_access_matrix(app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_sicoob_access_matrix(app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_sicoob_access_matrix(app_role) TO service_role;
