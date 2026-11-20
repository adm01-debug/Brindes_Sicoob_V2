# DB-35 — Isolamento multi-tenant por `organization_id` prometido e não implementado

- Origem: Multi-tenant (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: G
- Impacto no negocio: a promessa de "isolamento completo" vendida a uma segunda organização ou cooperativa não é verdade para várias áreas do portal; é risco contratual e de vazamento entre clientes.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

decidir o modelo oficial de tenant (organização × cooperativa), propagar a coluna e as policies às tabelas de negócio ou reescrever a documentação para refletir o isolamento por cooperativa/PA.

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
