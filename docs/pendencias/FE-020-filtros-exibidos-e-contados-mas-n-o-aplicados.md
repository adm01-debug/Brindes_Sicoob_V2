# FE-020 — Filtros exibidos e contados, mas não aplicados

- Origem: 2. Catálogo e filtros (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: o vendedor marca "Técnica: laser" ou "Novidades", vê "3 filtros ativos" e recebe a lista inteira. Isso gera confiança falsa e propostas erradas.

## Estado real conferido

PRONTO - useCatalogFiltering.ts (applyCatalogFilters) aplica technique/tag/size/activity/marketing/comemorativa via relationalIdFilter + quickOptionsFilter (isNew/newArrival, featured, isKit, hasPersonalization); FiltersPage via filters-page-helpers.ts linhas 273-298 aplica os mesmos predicados.

## O que falta (auditoria)

implementar os predicados que faltam nos dois pipelines, de preferência unificados.

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
