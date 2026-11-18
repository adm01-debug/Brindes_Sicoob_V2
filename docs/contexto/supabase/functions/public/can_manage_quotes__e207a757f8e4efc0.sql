CREATE OR REPLACE FUNCTION public.can_manage_quotes(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('supervisor'::public.app_role,
                   'admin'::public.app_role,
                   'manager'::public.app_role)
  )
$function$
