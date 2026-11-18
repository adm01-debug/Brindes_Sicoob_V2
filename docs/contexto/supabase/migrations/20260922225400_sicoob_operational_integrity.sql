-- Fecha bypasses de atomicidade, materializa a autoria do comprovante e
-- retroage a exigência de arte para pedidos personalizados existentes.
DROP POLICY IF EXISTS "Creators can insert items to their own draft orders"
  ON public.sicoob_order_items;
DROP POLICY IF EXISTS "Creators can delete items from their own draft orders"
  ON public.sicoob_order_items;

ALTER TABLE public.sicoob_order_shipments
  ADD COLUMN delivery_photo_uploaded_by uuid REFERENCES auth.users(id);
UPDATE public.sicoob_order_shipments
SET delivery_photo_uploaded_by=created_by
WHERE delivery_photo_path IS NOT NULL AND delivery_photo_uploaded_by IS NULL;
ALTER TABLE public.sicoob_order_shipments
  ADD CONSTRAINT sicoob_delivery_photo_uploader_required CHECK (
    delivery_photo_path IS NULL OR delivery_photo_uploaded_by IS NOT NULL
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_sicoob_order_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $function$
DECLARE v_metadata jsonb; v_mime text; v_size bigint; v_owner uuid;
BEGIN
  IF TG_TABLE_NAME='sicoob_order_invoices' THEN
    SELECT metadata INTO v_metadata FROM storage.objects
    WHERE bucket_id='sicoob-order-documents' AND name=NEW.file_path AND owner=NEW.created_by;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O arquivo da nota fiscal não existe ou pertence a outro usuário.' USING ERRCODE='23514';
    END IF;
    v_mime:=lower(COALESCE(v_metadata->>'mimetype',''));
    v_size:=CASE WHEN COALESCE(v_metadata->>'size','') ~ '^[0-9]+$' THEN (v_metadata->>'size')::bigint ELSE -1 END;
    IF v_size<1 OR v_size>10485760
       OR (NEW.file_type='pdf' AND v_mime<>'application/pdf')
       OR (NEW.file_type='xml' AND v_mime NOT IN ('application/xml','text/xml')) THEN
      RAISE EXCEPTION 'Tipo ou tamanho real do arquivo da nota fiscal é inválido.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='sicoob_order_shipments' AND NEW.delivery_photo_path IS NOT NULL
        AND (TG_OP='INSERT' OR NEW.delivery_photo_path IS DISTINCT FROM OLD.delivery_photo_path
             OR NEW.delivery_photo_uploaded_by IS DISTINCT FROM OLD.delivery_photo_uploaded_by) THEN
    v_owner:=COALESCE(auth.uid(),NEW.delivery_photo_uploaded_by,NEW.created_by);
    NEW.delivery_photo_uploaded_by:=v_owner;
    SELECT metadata INTO v_metadata FROM storage.objects
    WHERE bucket_id='sicoob-order-documents' AND name=NEW.delivery_photo_path AND owner=v_owner;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O comprovante de entrega não existe ou pertence a outro usuário.' USING ERRCODE='23514';
    END IF;
    v_mime:=lower(COALESCE(v_metadata->>'mimetype',''));
    v_size:=CASE WHEN COALESCE(v_metadata->>'size','') ~ '^[0-9]+$' THEN (v_metadata->>'size')::bigint ELSE -1 END;
    IF v_size<1 OR v_size>5242880 OR v_mime NOT IN ('image/jpeg','image/png','image/webp') THEN
      RAISE EXCEPTION 'Tipo ou tamanho real do comprovante de entrega é inválido.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.validate_sicoob_order_document() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS tr_validate_sicoob_delivery_document ON public.sicoob_order_shipments;
CREATE TRIGGER tr_validate_sicoob_delivery_document
BEFORE INSERT OR UPDATE OF delivery_photo_path,delivery_photo_uploaded_by,created_by
ON public.sicoob_order_shipments
FOR EACH ROW EXECUTE FUNCTION public.validate_sicoob_order_document();

DROP POLICY IF EXISTS "sicoob_order_documents_upload_by_authorized_actor" ON storage.objects;
CREATE POLICY "sicoob_order_documents_upload_by_authorized_actor" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id='sicoob-order-documents'
  AND owner=auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/delivery/[A-Za-z0-9][A-Za-z0-9._-]{0,239}\.(png|jpg|jpeg|webp)$'
  AND lower(COALESCE(metadata->>'mimetype','')) IN ('image/jpeg','image/png','image/webp')
  AND (
    (lower(COALESCE(metadata->>'mimetype',''))='image/jpeg' AND name ~* '\.(jpg|jpeg)$')
    OR (lower(COALESCE(metadata->>'mimetype',''))='image/png' AND name ~* '\.png$')
    OR (lower(COALESCE(metadata->>'mimetype',''))='image/webp' AND name ~* '\.webp$')
  )
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name,'/',1)::uuid)
);

UPDATE public.sicoob_orders o
SET requires_artwork=true,updated_at=clock_timestamp()
WHERE requires_artwork IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.sicoob_order_items i
    WHERE i.order_id=o.id
      AND jsonb_typeof(i.personalization_snapshot->'personalizations')='array'
      AND jsonb_array_length(i.personalization_snapshot->'personalizations')>0
  );

CREATE FUNCTION public.preserve_sicoob_artwork_requirement()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.requires_artwork IS TRUE AND NEW.requires_artwork IS FALSE THEN
    RAISE EXCEPTION 'A exigência de arte de um pedido personalizado não pode ser removida.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_sicoob_artwork_requirement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tr_preserve_sicoob_artwork_requirement
BEFORE UPDATE OF requires_artwork ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.preserve_sicoob_artwork_requirement();

COMMENT ON COLUMN public.sicoob_order_shipments.delivery_photo_uploaded_by IS
'Usuário proprietário do objeto Storage atualmente vinculado como comprovante de entrega.';
