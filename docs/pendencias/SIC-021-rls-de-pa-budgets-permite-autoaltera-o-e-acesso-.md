# SIC-021 — RLS de pa_budgets permite autoalteração e acesso entre cooperativas

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: um PA pode aumentar a própria verba e um gestor pode mexer na verba de outra cooperativa.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

RLS — limitar ao escopo da cooperativa, proibir o solicitante de alterar a própria verba ou alçada e fazer ajustes só por RPC com trilha. Confirmar em `pg_policies` no banco.

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
