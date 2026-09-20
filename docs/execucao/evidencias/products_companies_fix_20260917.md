# `products`/`companies` nos call-sites locais — investigação da Etapa 15

## `whitelabel-comparison.ts` — confirmado código morto
`grep -rl "whitelabel-comparison" src/` só retorna o próprio arquivo — zero importadores em todo o repo. Nenhuma correção de client foi aplicada (seria trabalho morto); fica como candidato a remoção, decisão de produto (Etapa 46 do plano de correções cobre isso via backlog).

## `products` — 3 call-sites — CORRIGIDO em 17/09/2026

**Evidência que resolveu a dúvida anterior:** `src/lib/external-db/products.ts:220-226` já usa `filters: { id: uniqueSupplierIds }` (array como valor) como filtro IN contra a tabela `suppliers` do catálogo externo — mesmo padrão em `product_variants`/`product_images` (`filters: { ..., product_id: chunk }`, `chunk` sendo um array de IDs). Confirmado: o bridge interpreta um array como valor de filtro como "IN", não precisa de `{ in: [...] }`. `fetchPromobrindProducts` (exportado no barrel `@/lib/external-db`) já aceita `filters` e `limit`, e sem `limit` pagina até 200k linhas/30s — por isso os 3 fixes passam `limit: productIds.length` explicitamente, replicando o padrão já usado pra `suppliers` no mesmo arquivo.

**Único ajuste de campo necessário:** o tipo `PromobrindProduct` não tem `price` — tem `sale_price` (e `cost_price`/`base_price` deprecated). Os 3 call-sites mapeiam `sale_price` → `price` ao montar o objeto local.

**Aplicado:**
- `src/pages/PublicComparisonPage.tsx` — `fetchPromobrindProducts({ filters: { id: productIds }, limit: productIds.length })`, mapeado pra `ProductDetail` local.
- `src/pages/PublicCollectionPage.tsx` — idêntico.
- `src/hooks/useQuoteTemplates.ts` (`validateTemplateItems`) — idêntico, usa `sale_price` no lugar de `price` na comparação de preço desatualizado.

**Verificação:** `npx tsc --noEmit -p .` rodou limpo (exit 0, 0 erros) nos 3 arquivos após a mudança.

**Não executado:** teste de runtime real (`npm run dev` + navegar até `/comparar-publica/:token` e `/colecao-publica/:token`) — não rodei o dev server nesta sessão. Recomendo esse teste manual antes de considerar a Etapa 41 (teste dos fluxos críticos) fechada.
