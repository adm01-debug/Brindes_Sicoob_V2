# FE-010 — Sidebar ignora o controle de acesso Sicoob (itens levam a 403; gestor sem o próprio painel)

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: cada papel vê opções que dão "proibido" e não encontra o próprio painel.

## Estado real conferido

PRONTO em main e877d0c58. SICOOB_ROUTE_ACCESS em src/lib/access/role-policy.ts:29 define roles por rota; rolesForSicoobPath (l.58-61) + canAccessSicoobPath (l.63-66). Todas as rotas sicoob sao envolvidas por SicoobRoute (App.tsx:128-132) que redireciona para /403 sem papel e renderiza skeleton enquanto resolve.

## O que falta (auditoria)

filtrar os itens por `SICOOB_ROUTE_ACCESS` e trocar `adminOnly` por `allowedRoles`.

## Camadas afetadas

- Front (router/RBAC)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- SicoobRoute, role-policy.ts, App.tsx


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
