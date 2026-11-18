CREATE OR REPLACE FUNCTION public.fn_audit_config_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.admin_config_audit (action_type, table_name, old_data, new_data, changed_by)
    VALUES (TG_OP, TG_TABLE_NAME, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
END;
$function$
