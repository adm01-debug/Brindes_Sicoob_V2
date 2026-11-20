# EDG-27 — Alerta de novo dispositivo sem e-mail e sem autenticação

- Origem: E-mail / notificação (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: titular não é avisado de login suspeito; terceiros podem gerar alertas falsos para qualquer conta.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

validar JWT e usar `auth.user.id`; enviar e-mail de alerta.

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
