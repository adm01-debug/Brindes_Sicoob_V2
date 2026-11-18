CREATE OR REPLACE FUNCTION public.guard_quote_item_content_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = OLD.quote_id) THEN
      PERFORM public.assert_quote_content_editable(OLD.quote_id);
    ELSIF pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Orçamento do item não encontrado.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.assert_quote_content_editable(OLD.quote_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.quote_id IS DISTINCT FROM OLD.quote_id) THEN
    PERFORM public.assert_quote_content_editable(NEW.quote_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
