CREATE OR REPLACE FUNCTION public.is_kit_owner(_kit_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.custom_kits
        WHERE id = _kit_id AND user_id = _user_id
     )
$function$
