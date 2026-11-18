CREATE OR REPLACE FUNCTION public.can_grant_mcp_full(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_dev(_user_id);
$function$
