CREATE OR REPLACE FUNCTION public.audit_all_rls_compliance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total INTEGER;
    v_with_rls INTEGER;
    v_missing TEXT[];
    v_permissive TEXT[];
    v_score DECIMAL(5,2);
    v_result JSONB;
BEGIN
    -- Contar tabelas no schema public
    SELECT count(*) INTO v_total FROM pg_tables WHERE schemaname = 'public';
    
    -- Tabelas com RLS habilitado
    SELECT count(*) INTO v_with_rls 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
    
    -- Listar tabelas sem RLS
    SELECT array_agg(relname) INTO v_missing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;
    
    -- Listar tabelas com políticas excessivamente permissivas (USING true)
    SELECT array_agg(DISTINCT tablename) INTO v_permissive
    FROM pg_policies
    WHERE schemaname = 'public' AND (qual = '(true)' OR with_check = '(true)');

    -- Calcular score (0-100)
    IF v_total > 0 THEN
        v_score := (v_with_rls::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_score := 100;
    END IF;

    -- Salvar auditoria
    INSERT INTO public.qa_rls_audits (tables_total, tables_with_rls, tables_missing_rls, tables_permissive_rls, score)
    VALUES (v_total, v_with_rls, COALESCE(v_missing, '{}'), COALESCE(v_permissive, '{}'), v_score);

    SELECT jsonb_build_object(
        'score', v_score,
        'total', v_total,
        'with_rls', v_with_rls,
        'missing', COALESCE(v_missing, '{}'),
        'permissive', COALESCE(v_permissive, '{}')
    ) INTO v_result;

    RETURN v_result;
END;
$function$
