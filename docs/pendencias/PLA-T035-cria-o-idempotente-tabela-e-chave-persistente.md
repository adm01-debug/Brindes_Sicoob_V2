# PLA-T035 — Criação idempotente: tabela e chave persistente

- Origem: Fase 4 — Orçamentos (Plano de encerramento (100 etapas))
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: queda de rede no momento de salvar pode gerar orçamento duplicado.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

INSERT só via RPC (`SECURITY DEFINER`), chave persistida entre remontagens e contrato recuperável para edição.

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
