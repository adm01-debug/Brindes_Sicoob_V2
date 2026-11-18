CREATE OR REPLACE FUNCTION public.validate_sicoob_order_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_document public.sicoob_document_registry%ROWTYPE;
  v_owner uuid;
  v_linked_record_id uuid;
BEGIN
  IF TG_TABLE_NAME='sicoob_order_invoices' THEN
    SELECT * INTO v_document FROM public.sicoob_document_registry
    WHERE final_path=NEW.file_path AND order_id=NEW.order_id AND uploaded_by=NEW.created_by
      AND status='clean' AND purpose=CASE WHEN NEW.file_type='pdf' THEN 'invoice_pdf' ELSE 'invoice_xml' END
    FOR UPDATE;
    IF NOT FOUND OR (v_document.linked_record_id IS NOT NULL AND v_document.linked_record_id IS DISTINCT FROM NEW.id) THEN
      RAISE EXCEPTION 'A nota fiscal não possui inspeção limpa, íntegra e disponível.' USING ERRCODE='23514';
    END IF;
    NEW.document_id:=v_document.id;
    UPDATE public.sicoob_document_registry SET linked_at=clock_timestamp(),linked_entity='invoice',linked_record_id=NEW.id
    WHERE id=v_document.id;
  ELSIF TG_TABLE_NAME='sicoob_order_shipments' AND NEW.delivery_photo_path IS NULL THEN
    NEW.delivery_document_id:=NULL;
    NEW.delivery_photo_uploaded_by:=NULL;
  ELSIF TG_TABLE_NAME='sicoob_order_shipments' THEN
    v_owner:=COALESCE(auth.uid(),NEW.delivery_photo_uploaded_by,NEW.created_by);
    SELECT shipment.id INTO v_linked_record_id
    FROM public.sicoob_order_shipments shipment WHERE shipment.order_id=NEW.order_id;
    v_linked_record_id:=COALESCE(v_linked_record_id,NEW.id);
    SELECT * INTO v_document FROM public.sicoob_document_registry
    WHERE final_path=NEW.delivery_photo_path AND order_id=NEW.order_id AND uploaded_by=v_owner
      AND status='clean' AND purpose='delivery_proof'
    FOR UPDATE;
    IF NOT FOUND OR (v_document.linked_record_id IS NOT NULL AND v_document.linked_record_id IS DISTINCT FROM v_linked_record_id) THEN
      RAISE EXCEPTION 'O comprovante não possui inspeção limpa, íntegra e disponível.' USING ERRCODE='23514';
    END IF;
    NEW.delivery_document_id:=v_document.id;
    NEW.delivery_photo_uploaded_by:=v_owner;
    UPDATE public.sicoob_document_registry SET linked_at=clock_timestamp(),linked_entity='shipment',linked_record_id=v_linked_record_id
    WHERE id=v_document.id;
  END IF;
  RETURN NEW;
END;
$function$
