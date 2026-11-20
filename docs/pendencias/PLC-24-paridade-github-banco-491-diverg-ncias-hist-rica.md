# PLC-24 — Paridade GitHub × banco: 491 divergências históricas de migrations

- Origem: C. Banco de dados e paridade GitHub × Supabase (Planos de melhorias e correções)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: G
- Impacto no negocio: ninguém consegue reconstruir o banco a partir do Git; uma recuperação de desastre ou um novo ambiente fica imprevisível.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

revisão semântica objeto a objeto das 462 migrations (arquivar as superadas, registrar as aplicadas, descartar as nunca aplicadas), conferir as 19 sem corpo e um job de `db diff` de schema.

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
