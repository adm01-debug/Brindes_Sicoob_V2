-- NOT VALID preserva eventuais registros históricos para reconciliação,
-- mas impede imediatamente novas referências órfãs.
DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.order_consolidations'::regclass
      AND conname = 'order_consolidations_singular_id_fkey'
  ) THEN
    ALTER TABLE public.order_consolidations
      ADD CONSTRAINT order_consolidations_singular_id_fkey
      FOREIGN KEY (singular_id) REFERENCES public.cooperativas(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.order_consolidations'::regclass
      AND conname = 'order_consolidations_vendedor_id_fkey'
  ) THEN
    ALTER TABLE public.order_consolidations
      ADD CONSTRAINT order_consolidations_vendedor_id_fkey
      FOREIGN KEY (vendedor_id) REFERENCES auth.users(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$block$;
