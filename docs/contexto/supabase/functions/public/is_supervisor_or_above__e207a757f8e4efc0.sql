CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN (
            'dev'::public.app_role,
            'supervisor'::public.app_role,
            'admin'::public.app_role,
            'manager'::public.app_role
          )
     )
$function$
