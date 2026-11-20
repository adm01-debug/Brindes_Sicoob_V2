# SIC-022 — Ciclo de verba incompleto (reserva, compromisso, consumo), sem fechamento nem livro de eventos

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: G
- Impacto no negocio: não dá para fechar o mês da verba com segurança nem explicar cada centavo consumido.

## Estado real conferido

PARCIAL ? n?o h? ciclo reserva/compromisso/consumo nem fechamento/livro de eventos.

- Existe somente consumo: verba_consumida incrementado no confirmar pedido (validate_sicoob_order_budget) e estornado no cancelamento. N?o h? reserva no draft/submiss?o do or?amento, n?o h? compromisso, n?o h? fechamento mensal e n?o h? tabela de eventos (0 ocorr?ncias de budget_events/budget_ledger/reserva/compromisso).
- auditoria do PA ? audit_remaining_budget (coluna calculada no trigger) e sicoob_order_history ? n?o ? livro de eventos por centavo da verba.
- Falta: tabela verba_events (reserva/consumo/estorno/fechamento) + fun??o de fechamento mensal.

## O que falta (auditoria)

tabela de eventos de verba (reserva, compromisso, consumo, estorno, ajuste), estado de competência fechada, regra de estorno em período fechado e conciliação com `sicoob_budget_audit`. A regra de competência (data do pedido ou da aprovação) depende de decisão financeira.

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
