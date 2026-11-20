# SIC-026 — Alçadas configuráveis que o servidor ignora

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: regras de alçada configuradas na tela não valem de verdade.

## Estado real conferido

PRONTO no pedido; na etapa de or?amento ainda ? front (ver SIC-020).

- Server-side (pedido): confirm_sicoob_order (migration 20260911143000_atomicity) l? limite_alcada de pa_budgets do per?odo e, se total_amount > limite_alcada, exige solicita??o formal de aprova??o (err 23514). sicoob_actor_can_approve restringe o aprovador ? cooperativa/PA corretos. Guards RESTRICTIVE de 20261013115605 impedem o PA de alterar a pr?pria al?ada.
- Front (or?amento): al?ada verificada client-side em useQuoteBuilderState.validateTransactionLimit.
- Conclus?o: a al?ada configurada N?O ? ignorada pelo servidor ? a regra vale na transi??o para confirmado. Gap remanescente: valida??o server-side na etapa de or?amento.

## O que falta (auditoria)

RPC — aplicar escalonamento por valor da cooperativa, alçada por categoria e alçada individual; ou remover os campos.

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
