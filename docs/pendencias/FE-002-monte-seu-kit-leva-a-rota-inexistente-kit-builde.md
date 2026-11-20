# FE-002 — "Monte seu Kit" leva a rota inexistente `/kit-builder`

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o atalho de venda cruzada mais visível do catálogo leva a uma página de erro.

## Estado real conferido

PRONTO em main e877d0c58. Rota /montar-kit registrada em src/routes/config/tools.ts:33 (componente KitBuilderPage). KitBuilderPage le query params ?kit, ?product, ?template (l.148-151). KitLibraryPage navega para /montar-kit?kit= (l.466-471). Sem refs a rota /kit-builder.

## O que falta (auditoria)

trocar para `/montar-kit?product=`.

## Camadas afetadas

- Front (rota e construtor)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- KitBuilderPage, tools.ts, KitLibraryPage


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
