CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE _list_id uuid;
BEGIN
  IF _user_id IS NULL OR (auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'favorite_list_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.favorite_lists (user_id, name, icon, color, is_default, position)
  VALUES (_user_id, 'Meus Favoritos', 'Heart', '#EF4444', true, 0)
  ON CONFLICT (user_id) WHERE is_default DO NOTHING
  RETURNING id INTO _list_id;

  IF _list_id IS NULL THEN
    SELECT id INTO _list_id FROM public.favorite_lists
    WHERE user_id = _user_id AND is_default = true LIMIT 1;
  END IF;
  RETURN _list_id;
END;
$function$
