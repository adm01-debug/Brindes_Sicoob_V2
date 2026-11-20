# EDG-17 — `webhook-inbound` registra, mas não processa

- Origem: n8n / webhooks (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: M
- Impacto no negocio: dados enviados por parceiros ficam parados num log.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

roteador por `source_system`/`event_type` com handlers de negócio, fila de processamento e reprocessamento.

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
