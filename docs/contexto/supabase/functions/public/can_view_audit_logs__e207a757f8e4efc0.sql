CREATE OR REPLACE FUNCTION public.can_view_audit_logs(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_dev(_user_id)
$function$
