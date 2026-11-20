# EDG-07 — Funções que leem `products` local (inexistente) e `price_history` não alimentado

- Origem: Catálogo / bridge (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: M
- Impacto no negocio: "avise-me quando baixar o preço" de favoritos, coleções e comparações não funciona; busca visual perde o plano B.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

ler preços do catálogo externo via `createReadOnlyCatalogFetch`; definir processo que alimente `price_history`; só então agendar (EDG-41).

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
