-- Permite que PostgREST infira corretamente o alvo de ON CONFLICT usado pelo
-- cliente. O índice anterior aplicava COALESCE(variant_id, '') e, por ser uma
-- expressão, não correspondia a on_conflict=list_id,product_id,variant_id.

CREATE UNIQUE INDEX favorite_items_list_product_variant_unique_idx
  ON public.favorite_items (list_id, product_id, variant_id)
  NULLS NOT DISTINCT;

ALTER TABLE public.favorite_items
  ADD CONSTRAINT favorite_items_list_product_variant_key
  UNIQUE USING INDEX favorite_items_list_product_variant_unique_idx;

DROP INDEX IF EXISTS public.idx_favorite_items_unique;
