# SIC-027 — Remanejamento de verba entre PAs

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: NAO_INICIADA | Prioridade: P2 | Esforco: M
- Impacto no negocio: um PA sem saldo trava o pedido mesmo que outro PA tenha sobra.

## Estado real conferido

CONFIRMADO NAO IMPLEMENTADO - sem RPC de transferencia entre PAs (grep transfer_verba/remanejar: 0 ocorr?ncias em migrations/functions); OrderBudgetIntelligence.tsx:46 s? informa "excede saldo; aprova??o da Singular ou remanejamento" sem a??o. Fluxo: pedido trava em PA sem saldo.

## O que falta (auditoria)

RPC de transferência entre PAs da mesma Singular, com alçada e trilha.

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
