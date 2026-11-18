CREATE OR REPLACE FUNCTION public.get_test_auth_integrity(test_emails text[])
 RETURNS TABLE(email text, user_id uuid, exists_in_users boolean, has_identities boolean, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH target_emails AS (
        SELECT unnest(test_emails) as target_email
    )
    SELECT 
        te.target_email as email,
        u.id as user_id,
        (u.id IS NOT NULL) as exists_in_users,
        (EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) as has_identities,
        (u.id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) as is_valid
    FROM target_emails te
    LEFT JOIN auth.users u ON lower(u.email) = lower(te.target_email);
END;
$function$
