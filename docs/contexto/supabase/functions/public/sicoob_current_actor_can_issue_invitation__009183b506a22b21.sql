CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_issue_invitation(p_cooperative_id uuid, p_role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_inviter_can_issue(auth.uid(), p_cooperative_id, p_role);
$function$
