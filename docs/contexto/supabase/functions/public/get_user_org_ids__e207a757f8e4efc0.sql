CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id
    FROM public.organization_members
   WHERE user_id = _user_id
     AND _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
$function$
