CREATE OR REPLACE FUNCTION public.preserve_sicoob_artwork_requirement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.requires_artwork IS TRUE AND NEW.requires_artwork IS FALSE THEN
    RAISE EXCEPTION 'A exigência de arte de um pedido personalizado não pode ser removida.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
