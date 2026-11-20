# EDG-26 — `cleanup-notifications` e `process-queue` redundantes/vazias

- Origem: E-mail / notificação (Edge Functions e integrações)
- Status auditoria: STUB/MOCK | Prioridade: P3 | Esforco: P
- Impacto no negocio: nenhum direto; ocupam capacidade e confundem a operação.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

despublicar ambas (liberam vagas, EDG-55) ou dar a `process-queue` um papel real (ex.: despachante de EDG-23).

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
