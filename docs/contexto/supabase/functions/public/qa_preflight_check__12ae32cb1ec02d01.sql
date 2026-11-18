CREATE OR REPLACE FUNCTION public.qa_preflight_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
    users_ok BOOLEAN;
    pas_ok BOOLEAN;
    budgets_ok BOOLEAN;
    coupons_ok BOOLEAN;
    orders_ok BOOLEAN;
BEGIN
    SELECT count(*) > 0 INTO users_ok FROM auth.users WHERE email LIKE 'qa+%';
    SELECT count(*) > 0 INTO pas_ok FROM public.postos_atendimento WHERE is_active IS TRUE;
    SELECT count(*) > 0 INTO budgets_ok FROM public.pa_budgets;
    SELECT count(*) > 0 INTO coupons_ok FROM public.coupons;
    SELECT count(*) > 0 INTO orders_ok FROM public.orders;

    result := jsonb_build_object(
        'users', users_ok,
        'pas', pas_ok,
        'budgets', budgets_ok,
        'coupons', coupons_ok,
        'orders', orders_ok,
        'timestamp', now()
    );
    
    RETURN result;
END;
$function$
