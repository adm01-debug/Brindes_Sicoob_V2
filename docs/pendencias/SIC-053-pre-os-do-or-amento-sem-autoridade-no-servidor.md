# SIC-053 — Preços do orçamento sem autoridade no servidor

- Origem: 6. Orçamento e versionamento (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: preço e custo do orçamento podem ser manipulados sem trava no servidor.

## Estado real conferido

PRONTO/DESCARTADO em main e877d0c58. `supabase/functions/quote-price-attestation/contract.ts` (exactMoney, verifyQuoteCatalogItem, isQuoteCatalogSnapshotUnchanged), `handler.ts` l.199-211 valida unit_cost/setup/total contra tabela vigente, l.364-373 revalida snapshot de catalogo, l.384-394 registra atestado via RPC `register_quote_price_attestation`; `index.ts` exposto via sicoob-kit-quote (`op: price-attestation`). Autoridade do preco negociado continua decisao comercial (auditoria dimensao 11).

## O que falta (auditoria)

RPC — conferir a parcela da personalização e um piso ou snapshot de preço de catálogo com a origem gravada. A autoridade do preço negociado é decisão comercial pendente (`auditoria-tecnica-2026-10-02.md`, dimensão 11).

## Camadas afetadas

- Edge function (quote-price-attestation), RPC


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- quote-price-attestation, sicoob-kit-quote


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (validacao server-side integrada em main)
