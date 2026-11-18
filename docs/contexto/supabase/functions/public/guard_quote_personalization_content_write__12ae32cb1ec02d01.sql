CREATE OR REPLACE FUNCTION public.guard_quote_personalization_content_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_old_quote_id uuid;
  v_new_quote_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT qi.quote_id INTO v_old_quote_id
    FROM public.quote_items qi
    WHERE qi.id = OLD.quote_item_id;

    -- Na exclusão em cascata o item pai já não é visível. A exclusão dele foi
    -- validada pelo gatilho de quote_items antes de iniciar a cascata.
    IF FOUND THEN
      PERFORM public.assert_quote_content_editable(v_old_quote_id);
    ELSIF TG_OP <> 'DELETE' OR pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Item de orçamento da personalização não encontrado.';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.quote_item_id IS DISTINCT FROM OLD.quote_item_id) THEN
    SELECT qi.quote_id INTO v_new_quote_id
    FROM public.quote_items qi
    WHERE qi.id = NEW.quote_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Item de orçamento da personalização não encontrado.';
    END IF;
    PERFORM public.assert_quote_content_editable(v_new_quote_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
