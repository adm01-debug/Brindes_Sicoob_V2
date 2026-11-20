# DB-22 — Pipeline de notificações omnichannel nunca acionado (DND, resumo e canais sem efeito)

- Origem: Notificações (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: quem configura "Não perturbe" ou "Resumo diário" acha que está protegido, mas a configuração é ignorada e as notificações adiadas nunca chegam.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

rotear os eventos de negócio por `send-notification`, criar o worker agendado que despacha `scheduled_notifications` e `notification_digests` vencidos, e registrar o canal real.

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
