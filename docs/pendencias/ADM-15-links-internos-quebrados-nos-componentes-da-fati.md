# ADM-15 — Links internos quebrados nos componentes da fatia

- Origem: Painel admin, navegação e rotas (Admin, BI e IA)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: cliques em "buscas em alta", "demanda não atendida", "ver todas as solicitações" e "datas comemorativas" terminam em 404 ou em catálogo sem filtro.

## Estado real conferido

CONFIRMADO PARCIAL - (1) UpcomingDatesWidget.tsx:33 navega /filtros?data=<slug> mas deserializeFilters (filters-page-helpers.ts) so l? search/supplier/priceMin/priceMax/minStock/sortBy + ARRAY/BOOLEAN_KEYS; key correta de datas e datasComemorativas (slugs). (2) MyDiscountRequestsWidget.tsx:109 navega /admin/descontos - rota inexistente (admin.ts tem /admin/limites-desconto). (3) SmartSuggestions.tsx usa MOCK_SUGGESTIONS com /produtos/1..5 (produtos inexistentes). (4) UnmetDemandCard.tsx:82 usa /filtros?search=<term> - correto (search ? lido).

## O que falta (auditoria)

corrigir os destinos e os nomes dos parâmetros.

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
