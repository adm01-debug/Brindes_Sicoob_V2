-- A auditoria remota confirmou que não restam registros históricos que
-- violem as constraints introduzidas como NOT VALID no lote anterior.
-- A validação fecha a reconciliação sem reescrever ou excluir dados.
ALTER TABLE public.order_consolidations
  VALIDATE CONSTRAINT order_consolidations_singular_id_fkey;

ALTER TABLE public.order_consolidations
  VALIDATE CONSTRAINT order_consolidations_vendedor_id_fkey;

ALTER TABLE public.quote_approval_tokens
  VALIDATE CONSTRAINT quote_approval_signature_evidence_check;

ALTER TABLE public.sicoob_order_shipments
  VALIDATE CONSTRAINT sicoob_delivery_photo_uploader_required;
