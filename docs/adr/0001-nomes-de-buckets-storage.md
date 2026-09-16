# ADR 0001 — Nomes canônicos de buckets de Storage

**Data:** 16/09/2026 · **Status:** aceito · **Etapa:** 25 do plano de reconciliação

## Contexto

O código referenciava 2 buckets inexistentes: `art-files` e `avatars`. O
banco tem `mockup-art-files`, `order-documents`, `sicoob-order-documents`,
`proposals` (sem nenhum consumidor) e outros já corretamente usados.

## Decisão

- **`art-files` → `proposals`** (código corrigido, não o banco). Os 2 únicos
  usos de `art-files` (`src/pages/quote-view/QuoteBitrixSync.ts`,
  `QuoteActionHandlers.ts`) fazem upload de PDF de **proposta comercial**
  para sincronização com Bitrix24 — não são arquivos de arte/mockup. O
  bucket `proposals` já existe, já tem policies corretas
  (`INSERT`/`DELETE` authenticated, `SELECT` owner-ou-admin/dev) e não
  tinha nenhum consumidor. Não confundir com `mockup-art-files`, que seria
  a escolha errada aqui apesar do nome parecido com "art-files".
- **`avatars` → criado** (não existe equivalente). Bucket público
  (`public=true`, necessário porque o código usa `getPublicUrl()`), limite
  de 2MB, `image/png|jpeg|webp`. Policies: leitura pública (avatar é exibido
  na UI para qualquer usuário autenticado ver colegas), escrita restrita a
  `admin`/`dev` — confirmado no código (`UserService.uploadAvatar`, chamado
  só de `src/components/admin/users/useUserManagement.ts`) que é sempre um
  admin definindo o avatar de outro usuário, nunca auto-upload.

## Ressalva conhecida (não resolvida nesta sessão)

`proposals` não é um bucket público — `getPublicUrl()` gera uma URL que só
abre para quem já está autenticado como dono do arquivo ou admin/dev. Se o
fluxo do Bitrix24 depende de alguém **fora** do Supabase (ex.: um contato do
cliente) abrir esse link sem login, a URL não vai funcionar. Corrigir isso
exigiria trocar para `createSignedUrl()` com expiração, o que muda o
contrato da integração com Bitrix — decisão de produto, não só de nome de
bucket, por isso não foi feita aqui.
