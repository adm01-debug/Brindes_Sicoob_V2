CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role = 'dev'::public.app_role
    );
$function$
