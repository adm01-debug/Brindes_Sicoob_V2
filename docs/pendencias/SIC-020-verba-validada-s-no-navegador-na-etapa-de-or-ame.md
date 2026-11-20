# SIC-020 — Verba validada só no navegador na etapa de orçamento

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: a Singular aprova orçamentos que somam mais que a verba do PA e o bloqueio só aparece depois, na confirmação do pedido.

## Estado real conferido

PARCIAL real:

- Etapa de OR?AMENTO: verba validada s? no navegador. useQuoteBuilderState.ts validatePaBudget (client-side) l? pa_budgets direto: validateTransactionLimit(total, limite_alcada) + validateMonthlyBudget(total, verba_total - verba_consumida), toast 'Verba insuficiente'. N?o h? RPC server-side na cria??o/edi??o da quote.
- Etapa de PEDIDO: verba validada server-side. validate_sicoob_order_budget (trigger BEFORE UPDATE, migration 20260911143000) bloqueia confirmar sem saldo (verba_consumida + total > verba_total, err P0001) e incrementa verba_consumida atomicamente; impede alterar PA/valor/compet?ncia ap?s consumida.
- Conclus?o: o SIC descreve exatamente o fluxo atual ? a Singular pode aprovar or?amentos que somam mais que a verba na fase de or?amento; o bloqueio real s? ocorre no confirmar pedido. Falta RPC/trigger validando verba na etapa de or?amento.

## O que falta (auditoria)

RPC — validar (e, se a política pedir, reservar) a verba em `pending_singular_approval` e `approved_singular`; testes de disputa de saldo entre orçamentos.

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
