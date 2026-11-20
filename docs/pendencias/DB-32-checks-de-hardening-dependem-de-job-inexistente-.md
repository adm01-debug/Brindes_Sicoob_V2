# DB-32 — Checks de hardening dependem de job inexistente e de MFA "assumido"

- Origem: Segurança/RBAC (Banco e migrations)
- Status auditoria: STUB/MOCK | Prioridade: P2 | Esforco: P
- Impacto no negocio: o painel de segurança mostra falha permanente, o que gera alarme diário a admins e acostuma a ignorar alertas, e ao mesmo tempo dá ponto de MFA sem conferir.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

alinhar o nome do job (ou consultar pelo comando) e medir MFA de verdade (por exemplo, fatores verificados de admin/dev em `auth.mfa_factors`).

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
