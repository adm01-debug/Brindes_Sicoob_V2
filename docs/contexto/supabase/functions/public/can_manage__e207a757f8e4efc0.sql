CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role IN ('admin', 'manager')
     )
$function$
