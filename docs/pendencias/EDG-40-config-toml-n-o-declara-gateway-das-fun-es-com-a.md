# EDG-40 — `config.toml` não declara gateway das funções com autenticação própria

- Origem: Segurança / auth (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: parceiros e clientes MCP sem JWT do Supabase podem ser barrados antes do código.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

declarar `verify_jwt = false` onde a autenticação é própria e conferir o estado remoto (a confirmar).

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
