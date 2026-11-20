# FE-041 — Resultado "Cliente" da busca global leva a 404

- Origem: 4. Busca (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: todo clique em cliente pela busca falha.

## Estado real conferido

PRONTO em main e877d0c58. Resultado cliente da busca usa clientDetailPath (useGlobalSearch.ts:346) = /clientes/:id (clientRoutes.ts:3). Rota /clientes/:id registrada em App.tsx:145 com ClientDetailPage.

## O que falta (auditoria)

corrigir o caminho.

## Camadas afetadas

- Front (busca/rotas)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- useGlobalSearch, clientRoutes.ts, App.tsx


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
