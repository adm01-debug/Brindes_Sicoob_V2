# SIC-051 — Idempotência do salvamento incompleta

- Origem: 6. Orçamento e versionamento (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: em rede ruim, o vendedor ou PA pode gerar orçamento duplicado ou ver erro em algo que já salvou.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

persistir a intenção com o rascunho, contrato idempotente para edição e INSERT no ledger só via RPC.

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
