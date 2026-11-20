# SIC-010 — A aba "Vínculos" grava papéis inexistentes em profiles.role

- Origem: 2. Usuários e papéis (Fluxos Sicoob)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: P
- Impacto no negocio: o admin acha que deu acesso, mas o usuário continua barrado ou fora do escopo certo.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

UI e RPC — atribuir papéis válidos (`gerente_pa`, `comprador_pac`, `gestor_compras`, `comprador_singular`, `vendedor`) em `user_roles` por RPC auditada, com sincronia ou eliminação de `profiles.role`.

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
