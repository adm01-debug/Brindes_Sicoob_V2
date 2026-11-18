CREATE OR REPLACE FUNCTION public.sicoob_guard_reorder_catalog_validity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF (OLD.reorder_source_order_id IS NOT NULL OR OLD.reorder_source_quote_id IS NOT NULL)
     AND NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular')
     AND NEW.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular', 'expired')
     AND (
       OLD.catalog_valid_until IS NULL
       OR OLD.catalog_valid_until <= statement_timestamp()
       OR EXISTS (
         SELECT 1 FROM public.quote_items qi
         WHERE qi.quote_id = OLD.id
           AND (qi.catalog_valid_until IS NULL OR qi.catalog_valid_until <= statement_timestamp())
       )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Preço e estoque da recompra venceram; revalide o catálogo antes de continuar.';
  END IF;
  RETURN NEW;
END;
$function$
