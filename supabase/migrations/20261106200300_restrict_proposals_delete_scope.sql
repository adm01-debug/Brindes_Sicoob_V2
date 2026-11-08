-- Restringe a deleção de objetos do bucket 'proposals' ao escopo do orçamento.
-- Remove a policy genérica "Authenticated users can delete proposals" que permitia
-- qualquer usuário autenticado apagar QUALQUER objeto do bucket.

DROP POLICY IF EXISTS "Authenticated users can delete proposals" ON storage.objects;

CREATE POLICY "proposals_quote_scope_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] = 'quotes'
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = CASE
      WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (storage.foldername(name))[2]::uuid
      ELSE NULL
    END
      AND (q.seller_id = (SELECT auth.uid())
        OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
  )
);