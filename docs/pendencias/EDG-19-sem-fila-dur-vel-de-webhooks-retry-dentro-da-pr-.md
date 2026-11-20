# EDG-19 — Sem fila durável de webhooks: retry dentro da própria requisição

- Origem: n8n / webhooks (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: M
- Impacto no negocio: em instabilidade do destino, eventos se perdem sem rastro.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

outbox de webhooks com lease e backoff (o padrão já existe em `sicoob_approval_deliveries`).

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
