# FE-003 — Links para `/catalogo` (rota inexistente)

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o usuário que quer voltar a comprar cai em página de erro.

## Estado real conferido

PRONTO em main e877d0c58. A rota /catalogo nao existe mais em nenhum lugar do src (0 refs); a placa canonica e /filtros (products.ts:22) e /produtos (l.19), ambas montando FiltersPage. Nao ha link quebrado para /catalogo.

## O que falta (auditoria)

criar um redirect `/catalogo` → `/filtros` (mapeando `busca` → `search`) ou corrigir os links.

## Camadas afetadas

- Front (rotas)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- products.ts, FiltersPage


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
