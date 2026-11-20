# DB-03 — 35 migrations ativas sem ledger cujo efeito não existe no banco

- Origem: Ledger e governança de schema (Banco e migrations)
- Status auditoria: NAO_INICIADA | Prioridade: P2 | Esforco: M
- Impacto no negocio: risco de alguém "aplicar pendências" e recriar tabelas locais de produtos, clientes e cores que conflitam com os sistemas oficiais.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

registrar formalmente "superada/abandonada" por arquivo e mover para `migrations_archive/` (como foi feito com o cluster `20250103_*`), além de remover os nomes da lista estática `external-db-config.ts:123-124`.

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
