CREATE OR REPLACE FUNCTION public.protect_latest_quote_version_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_root_id uuid := COALESCE(OLD.parent_quote_id, OLD.id);
BEGIN
  IF TG_OP = 'UPDATE' AND NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  IF OLD.is_latest_version
     AND EXISTS (
       SELECT 1 FROM public.quotes q
       WHERE q.id <> OLD.id
         AND (q.id = v_root_id OR q.parent_quote_id = v_root_id)
         AND q.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A versão vigente não pode ser excluída enquanto a família possuir outras versões.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
