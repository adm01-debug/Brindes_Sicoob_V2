CREATE OR REPLACE FUNCTION public.can_approve_discount(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.can_manage_quotes(_user_id)
$function$
