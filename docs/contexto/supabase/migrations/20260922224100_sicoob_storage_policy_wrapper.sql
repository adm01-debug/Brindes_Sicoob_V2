-- Wrapper de policy: fixa o ator autenticado sem reabrir o helper parametrizado.
CREATE FUNCTION public.sicoob_current_actor_can_manage_fulfillment(p_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), p_order_id);
$$;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_manage_fulfillment(uuid) TO authenticated;

DROP POLICY IF EXISTS "sicoob_order_documents_upload_invoice" ON storage.objects;
CREATE POLICY "sicoob_order_documents_upload_invoice" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'sicoob-order-documents'
  AND name ~ '^[0-9a-fA-F-]+/invoices/.+\.(pdf|xml)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
);
DROP POLICY IF EXISTS "sicoob_order_documents_upload_artwork" ON storage.objects;
CREATE POLICY "sicoob_order_documents_upload_artwork" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'sicoob-order-documents'
  AND name ~ '^[0-9a-fA-F-]+/artwork/.+\.(pdf|png|jpg|jpeg|webp)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
);
DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_invoice" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_invoice" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/invoices/.+\.(pdf|xml)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
);
DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_artwork" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_artwork" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/artwork/.+\.(pdf|png|jpg|jpeg|webp)$'
  AND public.sicoob_current_actor_can_manage_fulfillment(split_part(name, '/', 1)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_artwork_versions artwork
    WHERE artwork.file_path = name
  )
);
