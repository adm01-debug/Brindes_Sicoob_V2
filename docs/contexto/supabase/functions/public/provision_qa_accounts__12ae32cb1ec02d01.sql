CREATE OR REPLACE FUNCTION public.provision_qa_accounts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN jsonb_build_object('status', 'ready', 'message', 'Base de perfis QA preparada via admin client');
END;
$function$
