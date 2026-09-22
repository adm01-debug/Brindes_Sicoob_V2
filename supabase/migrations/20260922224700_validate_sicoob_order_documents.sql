CREATE UNIQUE INDEX ux_sicoob_order_invoice_file_path
  ON public.sicoob_order_invoices(file_path);
CREATE UNIQUE INDEX ux_sicoob_order_shipment_delivery_photo
  ON public.sicoob_order_shipments(delivery_photo_path)
  WHERE delivery_photo_path IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_sicoob_order_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $function$
DECLARE
  v_metadata jsonb;
  v_mime text;
  v_size bigint;
BEGIN
  IF TG_TABLE_NAME = 'sicoob_order_invoices' THEN
    SELECT metadata INTO v_metadata
    FROM storage.objects
    WHERE bucket_id = 'sicoob-order-documents'
      AND name = NEW.file_path
      AND owner = NEW.created_by;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O arquivo da nota fiscal não existe ou pertence a outro usuário.' USING ERRCODE = '23514';
    END IF;
    v_mime := lower(COALESCE(v_metadata->>'mimetype', ''));
    v_size := CASE WHEN COALESCE(v_metadata->>'size', '') ~ '^[0-9]+$' THEN (v_metadata->>'size')::bigint ELSE -1 END;
    IF v_size < 1 OR v_size > 10485760
       OR (NEW.file_type = 'pdf' AND v_mime <> 'application/pdf')
       OR (NEW.file_type = 'xml' AND v_mime NOT IN ('application/xml', 'text/xml')) THEN
      RAISE EXCEPTION 'Tipo ou tamanho real do arquivo da nota fiscal é inválido.' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'sicoob_order_shipments' AND NEW.delivery_photo_path IS NOT NULL
        AND (TG_OP = 'INSERT' OR NEW.delivery_photo_path IS DISTINCT FROM OLD.delivery_photo_path) THEN
    SELECT metadata INTO v_metadata
    FROM storage.objects
    WHERE bucket_id = 'sicoob-order-documents'
      AND name = NEW.delivery_photo_path
      AND owner = NEW.created_by;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O comprovante de entrega não existe ou pertence a outro usuário.' USING ERRCODE = '23514';
    END IF;
    v_mime := lower(COALESCE(v_metadata->>'mimetype', ''));
    v_size := CASE WHEN COALESCE(v_metadata->>'size', '') ~ '^[0-9]+$' THEN (v_metadata->>'size')::bigint ELSE -1 END;
    IF v_size < 1 OR v_size > 5242880
       OR v_mime NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'Tipo ou tamanho real do comprovante de entrega é inválido.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_sicoob_order_document() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tr_validate_sicoob_invoice_document
BEFORE INSERT OR UPDATE OF file_path, file_type, created_by
ON public.sicoob_order_invoices
FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_order_document();

CREATE TRIGGER tr_validate_sicoob_delivery_document
BEFORE INSERT OR UPDATE OF delivery_photo_path, created_by
ON public.sicoob_order_shipments
FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_order_document();

DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_invoice" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_invoice" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/invoices/.+\.(pdf|xml)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_invoices invoice WHERE invoice.file_path = name
  )
);

DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_delivery" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_delivery" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/delivery/.+\.(png|jpg|jpeg|webp)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_shipments shipment WHERE shipment.delivery_photo_path = name
  )
);
