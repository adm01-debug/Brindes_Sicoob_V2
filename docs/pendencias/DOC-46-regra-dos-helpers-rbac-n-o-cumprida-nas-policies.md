# DOC-46 — Regra dos helpers RBAC não cumprida nas policies novas

- Origem: Tema F — Segurança e governança (SECURITY*, secrets, branch protection, runbooks, ADRs, docs/security) (Documentação funcional)
- Status auditoria: DOC_DIVERGENTE | Prioridade: P3 | Esforco: P
- Impacto no negocio: a política de acesso fica inconsistente quando os papéis legados forem removidos.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

refatorar para `is_supervisor_or_above` ou `can_*` e criar o gate.

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
