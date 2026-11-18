CREATE OR REPLACE FUNCTION public.get_sicoob_access_state()
 RETURNS TABLE(active boolean, reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT CASE
           WHEN auth.uid() IS NULL THEN false
           WHEN NOT EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.user_id = auth.uid()
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
           ) THEN false
           WHEN NOT EXISTS (
             SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
           ) THEN false
           ELSE true
         END,
         CASE
           WHEN auth.uid() IS NULL THEN 'missing_session'
           WHEN NOT EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.user_id = auth.uid()
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
           ) THEN 'membership_revoked'
           WHEN NOT EXISTS (
             SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
           ) THEN 'roles_revoked'
           ELSE 'active'
         END;
$function$
