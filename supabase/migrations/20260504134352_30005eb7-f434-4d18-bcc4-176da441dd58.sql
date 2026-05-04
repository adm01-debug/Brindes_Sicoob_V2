CREATE OR REPLACE FUNCTION public.cleanup_test_auth_orphans(test_ids uuid[])
RETURNS TABLE(deleted_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH deleted_users AS (
        DELETE FROM auth.users
        WHERE id = ANY(test_ids)
        RETURNING id, users.email::text AS email
    )
    SELECT du.id, du.email FROM deleted_users du;
END;
$function$;