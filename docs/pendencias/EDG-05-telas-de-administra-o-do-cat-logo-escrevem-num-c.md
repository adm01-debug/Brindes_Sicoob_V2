# EDG-05 — Telas de administração do catálogo escrevem num catálogo somente leitura

- Origem: Catálogo / bridge (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: G
- Impacto no negocio: administrador clica em salvar produto, foto, técnica ou fornecedor e recebe erro.

## Estado real conferido

CONFIRMADO ? o sintoma ? real e causado por design read-only do cat?logo externo.

- `supabase/functions/external-db-bridge/index.ts`: o gate `isReadOnlyCatalogRequest(body)` retorna 403 `CATALOG_READ_ONLY` para qualquer `operation` != select/ping/rpc/batch-select, ANTES de autorizar e do switch CRUD (insert/update/delete/upsert existem no switch mas s?o inalcan??veis).
- `supabase/functions/_shared/external-read-only.ts` (`isReadOnlyCatalogRequest`): s? libera `select`, `ping`, `rpc` e `batch` de selects; nega qualquer grava??o.
- Front insiste em escrever no cat?logo externo via bridge: `useProductsManager` (`table:'products', operation:'update'` em bulk), `ProductsManager`, `AdminProductFormPage` (insert/update products), `NewCategoryDialog` (insert categories), `useSuppliersManager`/`useNewSupplierForm` (insert/update suppliers), `useExternalCollections` (insert/update collections / collection_products), `useTecnicasUnificadas`/`useTecnicasGravacao`/`useVariantesGravacao`/`useFornecedoresGravacao` (insert/update/delete personalization_techniques / tecnica_gravacao* / fornecedor_gravacao). Todos via `@/lib/external-db` ? `invokeExternalDbSingle` ? bridge.
- Resultado: qualquer save em produto/categoria/fornecedor/cole??o/t?cnica/grava??o retorna 403 `CATALOG_READ_ONLY` (o admin v? erro ao salvar).

Conclus?o da auditoria: a op??o "criar canal de escrita no sistema de origem" N?O existe nesta repo (o bridge n?o escreve e o `createReadOnlyCatalogFetch` pro?be at? fetch de escrita). Decis?o de produto pendente: esconder/desativar as telas de escrita OU ativar um canal de escrita SOURCE-SIDE (fora desta repo). Enquanto isso, o caminho de escrita morto (chamadas `invokeExternalDbSingle` insert/update) permanece no front.

## O que falta (auditoria)

decisão de produto — esconder/remover as telas de edição ou criar um canal de escrita no sistema de origem do catálogo; remover o caminho de escrita morto do bridge.

## Camadas afetadas

- 

## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
