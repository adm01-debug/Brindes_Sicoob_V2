-- Correção automatizada robusta para todas as funções no schema public
-- Isso resolve os avisos de "Function Search Path Mutable" e aumenta a segurança SECURITY DEFINER
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as name, pg_get_function_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                func_record.schema, func_record.name, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar funções que não podem ser alteradas (ex: triggers de sistema se houver)
            RAISE NOTICE 'Não foi possível alterar a função %.%(%): %', 
                func_record.schema, func_record.name, func_record.args, SQLERRM;
        END;
    END LOOP;
END $$;
