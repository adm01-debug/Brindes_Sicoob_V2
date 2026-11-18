CREATE OR REPLACE FUNCTION public.is_singular_buyer_for_quote(user_id uuid, quote_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_singular_id UUID;
    quote_singular_id UUID;
    user_role public.app_role;
BEGIN
    -- Get user singular_id and role
    SELECT cooperativa_id, role::public.app_role INTO user_singular_id, user_role 
    FROM public.profiles 
    WHERE profiles.user_id = $1;

    -- Get quote singular_id
    SELECT singular_id INTO quote_singular_id 
    FROM public.quotes 
    WHERE id = $2;

    RETURN (user_role = 'comprador_singular' OR user_role = 'admin') AND user_singular_id = quote_singular_id;
END;
$function$
