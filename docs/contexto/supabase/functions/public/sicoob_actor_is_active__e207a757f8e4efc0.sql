CREATE OR REPLACE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.profiles p
       WHERE (p.user_id = _user_id OR p.id = _user_id)
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
    );
$function$
