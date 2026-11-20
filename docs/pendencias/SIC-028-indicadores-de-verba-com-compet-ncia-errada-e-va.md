# SIC-028 — Indicadores de verba com competência errada e valor fixo

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: STUB/MOCK | Prioridade: P2 | Esforco: P
- Impacto no negocio: o gestor decide olhando um saldo que pode ser fictício.

## Estado real conferido

PRONTO - budgetService.getBudgetByPa(paId, period) usa currentBudgetPeriod() com ano/mes reais (budgetService.ts:41-47); PAWalletPage.tsx:351 remaining = verba_total - verba_consumida (n?meros reais, sem mock).

## O que falta (auditoria)

UI e hook — competência do pedido, estado "verba não configurada" sem número inventado e rótulo correto.

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
