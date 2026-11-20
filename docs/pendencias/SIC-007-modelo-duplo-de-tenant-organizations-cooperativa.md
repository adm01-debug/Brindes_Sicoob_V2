# SIC-007 — Modelo duplo de tenant (organizations × cooperativas) e onboarding manual por SQL

- Origem: 1. Cadastro de cooperativa/organização e hierarquia Central→Singular→PA (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P3 | Esforco: M
- Impacto no negocio: há dois cadastros de "cliente" para a mesma cooperativa, e o escopo depende de qual deles foi preenchido.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

decidir qual tenant manda para o Sicoob e documentar a relação entre organização e cooperativa; o onboarding não pode depender de SQL manual.

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
