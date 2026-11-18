CREATE OR REPLACE FUNCTION public.move_favorite_to_trash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save
  );
  RETURN OLD;
END;
$function$
