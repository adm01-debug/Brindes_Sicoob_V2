# DB-05 — Alertas de queda de preço (favoritos e coleções) leem tabela inexistente

- Origem: Catálogo (Banco e migrations)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: M
- Impacto no negocio: o vendedor nunca é avisado quando um produto que ele favoritou ou colocou em coleção fica mais barato, e perde argumento de venda.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

ler preço atual pelo catálogo externo (`external-db-bridge` ou cliente somente leitura), ou criar de fato o cache sincronizado de preços; agendar as rotinas.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
