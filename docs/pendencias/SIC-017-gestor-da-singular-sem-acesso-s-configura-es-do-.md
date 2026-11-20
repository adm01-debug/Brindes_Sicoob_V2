# SIC-017 — Gestor da Singular sem acesso às configurações do próprio escopo

- Origem: 2. Usuários e papéis (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: a Singular não distribui verba entre seus PAs nem delega aprovações sem chamar a Promo.

## Estado real conferido

PARCIAL ? delega??es PRONTAS; `/gestor/verbas` e `/gestor/alertas` N?O existem.

PRONTO:
- `/gestor/delegacoes` ? `src/pages/sicoob/GestorDelegationsPage.tsx` ("GestorDelegationsPage", allowList MANAGERS em `role-policy.ts` SICOOB_ROUTE_ACCESS; rota em `sicoob-rbac.ts`; itens de delegar/revogar com escopo da unidade). Aprova??es tamb?m existem: `/gestor/aprovacoes` (PA_ROLES).
- `/gestor` (MANAGERS), `/gestor/orcamentos` (MANAGERS), `/gestor/compras` (MANAGERS), `/gestor/convites` (MANAGERS), `/gestor/agregados` (PA_ROLES), `/gestor/auditoria` (MANAGERS).

FALTA:
- `/gestor/verbas` ? N?O EXISTE. Verbas vivem em `/admin/verbas` (AdminVerbasPage, allowList exclusiva admin; `role-policy.ts` n?o tem `/gestor/verbas`). O GestorDashboardPage linka para `/admin/verbas` (fora do escopo da Singular ? gestor sem `admin` cai em 403). SIC ? o impacto exato: Singular n?o distribui verba entre seus PAs.
- `/gestor/alertas` ? N?O EXISTE. N?o h? rota girar alertas no escopo gestor (alertas atuais: estoque `/inventario`, incidentes `/admin/conexoes`, telemetria `/admin/telemetria`, notifica??es em settings). Sem rota dedicada de alertas da Singular.

## O que falta (auditoria)

UI — rotas `/gestor/verbas`, `/gestor/delegacoes`, `/gestor/alertas` restritas ao escopo da Singular.

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
