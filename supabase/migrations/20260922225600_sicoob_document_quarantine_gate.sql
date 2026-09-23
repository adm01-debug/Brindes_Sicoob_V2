-- Documentos financeiros e comprovantes só chegam ao bucket final depois de
-- inspeção dos bytes e parecer limpo de um scanner privado.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sicoob-document-quarantine', 'sicoob-document-quarantine', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=10485760;

CREATE TABLE public.sicoob_document_registry (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('invoice_pdf','invoice_xml','delivery_proof')),
  quarantine_path text NOT NULL UNIQUE,
  final_path text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status='clean'),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  detected_mime text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  scanner_name text NOT NULL,
  scanner_version text,
  scan_evidence jsonb NOT NULL CHECK (
    jsonb_typeof(scan_evidence)='object' AND scan_evidence @> '{"clean":true}'::jsonb
  ),
  scanned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  linked_at timestamptz,
  linked_entity text CHECK (linked_entity IN ('invoice','shipment')),
  linked_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.sicoob_document_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY sicoob_document_registry_read_in_order_scope
ON public.sicoob_document_registry FOR SELECT TO authenticated
USING (public.sicoob_current_actor_can_manage_fulfillment(order_id));

ALTER TABLE public.sicoob_order_invoices
  ADD COLUMN document_id uuid UNIQUE REFERENCES public.sicoob_document_registry(id) ON DELETE RESTRICT;
ALTER TABLE public.sicoob_order_shipments
  ADD COLUMN delivery_document_id uuid UNIQUE REFERENCES public.sicoob_document_registry(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.register_sicoob_clean_document(
  p_document_id uuid,
  p_actor_id uuid,
  p_order_id uuid,
  p_purpose text,
  p_quarantine_path text,
  p_final_path text,
  p_sha256 text,
  p_detected_mime text,
  p_byte_size bigint,
  p_scanner_name text,
  p_scanner_version text,
  p_scan_evidence jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'O registro exige o verificador interno.' USING ERRCODE='42501';
  END IF;
  IF p_document_id IS NULL OR p_actor_id IS NULL
     OR NOT public.sicoob_actor_can_manage_fulfillment(p_actor_id,p_order_id) THEN
    RAISE EXCEPTION 'Ator sem acesso ao pedido.' USING ERRCODE='42501';
  END IF;
  IF p_purpose NOT IN ('invoice_pdf','invoice_xml','delivery_proof')
     OR p_quarantine_path NOT LIKE p_actor_id::text||'/'||p_order_id::text||'/%'
     OR p_final_path NOT LIKE p_order_id::text||'/%'
     OR p_sha256 !~ '^[0-9a-f]{64}$'
     OR p_byte_size < 1 OR p_byte_size > 10485760
     OR nullif(btrim(p_scanner_name),'') IS NULL
     OR jsonb_typeof(p_scan_evidence) IS DISTINCT FROM 'object'
     OR p_scan_evidence->>'clean' IS DISTINCT FROM 'true'
     OR p_scan_evidence->>'engine' IS DISTINCT FROM p_scanner_name THEN
    RAISE EXCEPTION 'Evidência de inspeção inválida.' USING ERRCODE='22023';
  END IF;
  IF (p_purpose='invoice_pdf' AND (p_detected_mime<>'application/pdf' OR p_final_path NOT LIKE p_order_id::text||'/invoices/%.pdf'))
     OR (p_purpose='invoice_xml' AND (p_detected_mime<>'application/xml' OR p_final_path NOT LIKE p_order_id::text||'/invoices/%.xml'))
     OR (p_purpose='delivery_proof' AND (p_detected_mime NOT IN ('image/jpeg','image/png','image/webp') OR p_final_path NOT LIKE p_order_id::text||'/delivery/%')) THEN
    RAISE EXCEPTION 'Tipo detectado, finalidade e caminho final divergem.' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects object
    WHERE object.bucket_id='sicoob-document-quarantine' AND object.name=p_quarantine_path
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.objects object
    WHERE object.bucket_id='sicoob-order-documents' AND object.name=p_final_path
      AND lower(COALESCE(object.metadata->>'mimetype',''))=p_detected_mime
      AND COALESCE(object.metadata->>'size','')=p_byte_size::text
  ) THEN
    RAISE EXCEPTION 'Os objetos de quarentena e promoção não correspondem à evidência.' USING ERRCODE='23514';
  END IF;

  INSERT INTO public.sicoob_document_registry(
    id,order_id,purpose,quarantine_path,final_path,status,uploaded_by,
    sha256,detected_mime,byte_size,scanner_name,scanner_version,scan_evidence
  ) VALUES (
    p_document_id,p_order_id,p_purpose,p_quarantine_path,p_final_path,'clean',p_actor_id,
    p_sha256,p_detected_mime,p_byte_size,btrim(p_scanner_name),nullif(btrim(p_scanner_version),''),p_scan_evidence
  );
  RETURN p_document_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.register_sicoob_clean_document(uuid,uuid,uuid,text,text,text,text,text,bigint,text,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_sicoob_clean_document(uuid,uuid,uuid,text,text,text,text,text,bigint,text,text,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.validate_sicoob_order_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
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
$function$;
REVOKE ALL ON FUNCTION public.validate_sicoob_order_document() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS tr_validate_sicoob_invoice_document ON public.sicoob_order_invoices;
CREATE TRIGGER tr_validate_sicoob_invoice_document
BEFORE INSERT OR UPDATE OF file_path,file_type,created_by,document_id
ON public.sicoob_order_invoices FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_order_document();
DROP TRIGGER IF EXISTS tr_validate_sicoob_delivery_document ON public.sicoob_order_shipments;
CREATE TRIGGER tr_validate_sicoob_delivery_document
BEFORE INSERT OR UPDATE OF delivery_photo_path,delivery_photo_uploaded_by,created_by,delivery_document_id
ON public.sicoob_order_shipments FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_order_document();

-- O navegador não escreve mais documentos financeiros/comprovantes no bucket final.
DROP POLICY IF EXISTS "sicoob_order_documents_upload_invoice" ON storage.objects;
DROP POLICY IF EXISTS "sicoob_order_documents_upload_by_authorized_actor" ON storage.objects;

COMMENT ON TABLE public.sicoob_document_registry IS
'Registro imutável da inspeção por bytes e antimalware antes da promoção ao bucket final privado.';
