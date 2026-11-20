# DOC-27 — Sistema de notificações multicanal (e-mail, SMS, WhatsApp, push, "Não perturbe", resumo)

- Origem: Tema C — docs/NOTIFICATION_SYSTEM.md e e-mail (Documentação funcional)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: G
- Impacto no negocio: o usuário configura e-mail ou WhatsApp e nada chega. Quem liga "Não perturbe" ou "Resumo" deixa de receber os avisos que dependem dessa função.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

transporte real por canal, worker das agendadas e dos resumos com fuso America/Sao_Paulo, chamadas da função nos eventos de negócio, e remover os toggles sem efeito.

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
