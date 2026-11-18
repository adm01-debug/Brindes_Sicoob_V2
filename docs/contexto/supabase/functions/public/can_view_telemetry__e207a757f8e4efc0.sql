CREATE OR REPLACE FUNCTION public.can_view_telemetry(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_supervisor_or_above(_user_id)
$function$
