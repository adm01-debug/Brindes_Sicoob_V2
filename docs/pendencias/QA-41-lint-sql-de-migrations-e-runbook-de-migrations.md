# QA-41 — Lint SQL de migrations e runbook de migrations

- Origem: H. Workflows do GitHub (Testes, CI e infraestrutura)
- Status auditoria: NAO_INICIADA | Prioridade: P2 | Esforco: M
- Impacto no negocio: uma migration perigosa (bloqueio de tabela, função insegura) chega ao banco sem revisão automática.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

o lint no CI, as regras (sem `DROP` sem ADR, `CREATE INDEX CONCURRENTLY`, `search_path` em `SECURITY DEFINER`) e o runbook.

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
