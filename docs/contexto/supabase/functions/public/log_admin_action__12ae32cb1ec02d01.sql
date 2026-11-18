CREATE OR REPLACE FUNCTION public.log_admin_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    audit_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN audit_action := 'CREATE';
    ELSIF (TG_OP = 'UPDATE') THEN audit_action := 'UPDATE';
    ELSIF (TG_OP = 'DELETE') THEN audit_action := 'DELETE';
    END IF;

    INSERT INTO public.admin_audit_log (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        auth.uid(), 
        audit_action, 
        TG_TABLE_NAME, 
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text 
            ELSE NEW.id::text 
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NULL;
END;
$function$
