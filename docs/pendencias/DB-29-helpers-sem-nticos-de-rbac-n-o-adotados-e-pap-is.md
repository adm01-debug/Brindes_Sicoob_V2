# DB-29 — Helpers semânticos de RBAC não adotados e papéis legados não removidos

- Origem: Segurança/RBAC (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: M
- Impacto no negocio: as regras de acesso continuam espalhadas e dependentes de papéis antigos; mudar um perfil exige revisar dezenas de policies.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

migrar as policies de telemetria, conexões e auditoria para os helpers, executar a "onda" de remoção de `admin` e `manager` (já existe infraestrutura `role_migration_batches`) e eliminar os helpers redundantes.

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
