# DB-38 — Monitoramento de entrega de webhooks com alerta

- Origem: Integrações (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P3 | Esforco: P
- Impacto no negocio: falha de integração (Bitrix, n8n) só é percebida quando o cliente reclama.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

job de alerta de 5xx (pg_cron → Edge → Sentry/Slack) ou monitor externo documentado.

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
