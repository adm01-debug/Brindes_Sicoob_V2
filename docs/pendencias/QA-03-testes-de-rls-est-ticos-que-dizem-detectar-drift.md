# QA-03 — Testes de RLS "estáticos" que dizem detectar drift do banco, mas comparam a fixture com ela mesma

- Origem: A. Testes unitários (Vitest / Deno) (Testes, CI e infraestrutura)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: M
- Impacto no negocio: uma alteração de política de acesso em produção que exponha orçamentos entre vendedores não é detectada.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

ler `pg_policies` de verdade, seja no PostgreSQL descartável das simulações (`scripts/qa/*.py`) ou via API no job remoto, e comparar com o snapshot.

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
