# EDG-16 — Segredos HMAC criados pela UI não chegam às funções

- Origem: n8n / webhooks (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: integrações de terceiros são recusadas e as nossas saem sem assinatura, abrindo espaço para falsificação.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

resolver via `resolveCredential` (DB-first) e falhar fechado quando faltar segredo.

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
