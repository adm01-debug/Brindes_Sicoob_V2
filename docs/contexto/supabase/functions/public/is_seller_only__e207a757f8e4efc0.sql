CREATE OR REPLACE FUNCTION public.is_seller_only(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id,'vendedor'::public.app_role)
     AND NOT public.can_manage_quotes(_user_id)
     AND NOT public.is_admin_strict(_user_id)
$function$
