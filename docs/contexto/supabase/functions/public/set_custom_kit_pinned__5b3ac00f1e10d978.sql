CREATE OR REPLACE FUNCTION public.set_custom_kit_pinned(p_kit_id uuid, p_pinned boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  -- Serializa as mudanças do mesmo usuário, inclusive quando duas abas tentam
  -- fixar kits diferentes ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text, 20261016193000));

  SELECT user_id
  INTO v_owner
  FROM public.custom_kits
  WHERE id = p_kit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kit não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Kit fora do escopo do usuário.' USING ERRCODE = '42501';
  END IF;

  IF p_pinned THEN
    UPDATE public.custom_kits
    SET is_pinned = false,
        updated_at = now()
    WHERE user_id = v_actor
      AND is_pinned
      AND id <> p_kit_id;
  END IF;

  UPDATE public.custom_kits
  SET is_pinned = p_pinned,
      updated_at = now()
  WHERE id = p_kit_id
    AND user_id = v_actor;

  RETURN p_pinned;
END;
$function$
