CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND (
       public.is_admin_strict(_user_id)
       OR public.has_role(_user_id, 'manager'::public.app_role)
       OR public.has_role(_user_id, 'dev'::public.app_role)
     )
$function$
