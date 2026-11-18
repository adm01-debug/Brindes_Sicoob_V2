CREATE OR REPLACE FUNCTION public.move_collection_item_to_trash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
BEGIN
  SELECT user_id INTO _user_id FROM public.collections WHERE id = OLD.collection_id;
  IF _user_id IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.collection_items_trash (
    original_id, collection_id, user_id, product_id,
    color_name, color_hex, thumbnail_url, notes, sort_order
  ) VALUES (
    OLD.id, OLD.collection_id, _user_id, OLD.product_id,
    OLD.color_name, OLD.color_hex, OLD.thumbnail_url, OLD.notes, OLD.sort_order
  );
  RETURN OLD;
END;
$function$
