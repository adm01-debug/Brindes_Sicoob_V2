-- Vincula a evidência persistida ao SHA-256 que identifica o arquivo inspecionado.
-- NOT VALID preserva registros antigos para auditoria, mas exige consistência em
-- novas gravações e atualizações. A validação histórica requer reconciliação.
ALTER TABLE public.sicoob_document_registry
  ADD CONSTRAINT sicoob_document_registry_scan_evidence_sha256_match
  CHECK (
    jsonb_typeof(scan_evidence->'sha256') IS NOT DISTINCT FROM 'string'
    AND lower(scan_evidence->>'sha256') IS NOT DISTINCT FROM sha256
  ) NOT VALID;

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
     OR p_scan_evidence->>'engine' IS DISTINCT FROM p_scanner_name
     OR jsonb_typeof(p_scan_evidence->'sha256') IS DISTINCT FROM 'string'
     OR lower(p_scan_evidence->>'sha256') IS DISTINCT FROM p_sha256 THEN
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
