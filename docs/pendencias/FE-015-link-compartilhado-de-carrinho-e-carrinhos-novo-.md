# FE-015 — Link compartilhado de carrinho e `/carrinhos/novo` dão 404

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o link de carrinho enviado ao colega ou ao cliente abre uma página de erro.

## Estado real conferido

PRONTO em main e877d0c58. Rotas /carrinhos, /carrinhos/novo e /carrinhos/:cartId declaradas em src/routes/config/quotes.ts:51-59, todas montando SellerCartsPage.

## O que falta (auditoria)

declarar `/carrinhos/:cartId` e `/carrinhos/novo`.

## Camadas afetadas

- Front (rotas)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- quotes.ts, SellerCartsPage


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
