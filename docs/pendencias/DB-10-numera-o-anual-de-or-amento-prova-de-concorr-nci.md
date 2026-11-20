# DB-10 — Numeração anual de orçamento à prova de concorrência

- Origem: Orçamentos (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: em pico de uso, dois orçamentos podem receber o mesmo número, ou a gravação falha para o vendedor.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

sequência ou contador com trava (a tabela já desenhada) e teste de concorrência.

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
