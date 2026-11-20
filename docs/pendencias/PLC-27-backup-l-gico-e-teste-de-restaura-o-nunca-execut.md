# PLC-27 — Backup lógico e teste de restauração nunca executados

- Origem: C. Banco de dados e paridade GitHub × Supabase (Planos de melhorias e correções)
- Status auditoria: NAO_INICIADA | Prioridade: P1 | Esforco: M
- Impacto no negocio: se o banco for corrompido, não há prova de que dá para recuperar pedidos, verbas e aprovações.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

dump com hash, restore em projeto descartável com contagens conferidas e confirmação de PITR.

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
