# DOC-28 — E-mail transacional (status de pedido, orçamento enviado/aprovado)

- Origem: Tema C — docs/NOTIFICATION_SYSTEM.md e e-mail (Documentação funcional)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: M
- Impacto no negocio: o comprador não recebe e-mail de mudança de status do pedido; aumentam ligações e cobranças.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

implementar o envio (Resend já é usado em `_shared/approval-delivery.ts`) com fila durável e recibo.

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
