CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_setting('app.quote_governance_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, 'draft') <> 'draft'
       OR NEW.approved_by IS NOT NULL
       OR NEW.approved_at IS NOT NULL
       OR NEW.approved_pdf_url IS NOT NULL
       OR NEW.rejection_notes IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'A criação de orçamento deve iniciar como rascunho.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_pdf_url IS DISTINCT FROM OLD.approved_pdf_url
     OR NEW.rejection_notes IS DISTINCT FROM OLD.rejection_notes
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.singular_id IS DISTINCT FROM OLD.singular_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.';
  END IF;

  RETURN NEW;
END;
$function$
