CREATE OR REPLACE FUNCTION public.current_user_pa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT profile.pa_id
    FROM public.profiles AS profile
   WHERE (profile.user_id = (SELECT auth.uid()) OR profile.id = (SELECT auth.uid()))
     AND profile.is_active IS TRUE
     AND profile.deleted_at IS NULL
   LIMIT 1;
$function$
