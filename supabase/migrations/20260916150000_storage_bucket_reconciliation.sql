-- Reconciliação 16/09/2026 — Etapa 25. Registrado como documentação as-built
-- (já executado via MCP). Ver docs/adr/0001-nomes-de-buckets-storage.md.

-- avatars: não existia equivalente no banco; criado conforme decisão do ADR.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_admin_write" ON storage.objects;
CREATE POLICY "avatars_admin_write" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role)))
WITH CHECK (bucket_id = 'avatars' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role)));

-- art-files: não existe e não tem uso de arte/mockup real — os 2 únicos usos
-- no código (QuoteBitrixSync.ts, QuoteActionHandlers.ts) fazem upload de PDF
-- de PROPOSTA para sincronização com Bitrix24, não de arte. Corrigido no
-- código para usar o bucket "proposals", que já existe e já tem policies
-- corretas (upload/delete authenticated, select owner-ou-admin) mas estava
-- sem nenhum consumidor. Nenhuma alteração de schema necessária aqui.
