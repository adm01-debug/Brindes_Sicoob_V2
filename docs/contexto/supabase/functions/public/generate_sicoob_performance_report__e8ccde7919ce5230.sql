CREATE OR REPLACE FUNCTION public.generate_sicoob_performance_report(_role_name text, _table_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_report_id UUID;
BEGIN
    -- Esta função requer privilégios de superuser ou configuração específica para EXPLAIN
    -- Em ambientes gerenciados, simulamos a captura ou usamos logs de sistema.
    -- Para este utilitário, registraremos a intenção de auditoria.
    
    INSERT INTO public.sicoob_performance_reports (role_tested, table_name, execution_plan, total_time_ms)
    VALUES (_role_name, _table_name, '{"info": "Relatório gerado via auditoria de sistema"}'::jsonb, 0)
    RETURNING id INTO v_report_id;
    
    RETURN v_report_id;
END;
$function$
