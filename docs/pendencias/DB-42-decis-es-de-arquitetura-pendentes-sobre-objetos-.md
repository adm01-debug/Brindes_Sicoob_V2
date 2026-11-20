# DB-42 — Decisões de arquitetura pendentes sobre objetos de schema

- Origem: Cron/jobs (Banco e migrations)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P3 | Esforco: P
- Impacto no negocio: o schema acumula tabelas sem dono, e cada auditoria repete a mesma análise.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

dono de produto decidir (manter, construir ou remover), limpar a allowlist e fechar as lacunas da matriz RLS.

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
