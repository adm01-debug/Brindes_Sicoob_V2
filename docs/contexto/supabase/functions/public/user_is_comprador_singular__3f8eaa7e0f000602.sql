CREATE OR REPLACE FUNCTION public.user_is_comprador_singular(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = p_user_id
       AND role = 'comprador_singular'::public.app_role
  );
$function$
