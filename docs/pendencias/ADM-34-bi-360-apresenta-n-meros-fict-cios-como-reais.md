# ADM-34 — BI 360 apresenta números fictícios como reais

- Origem: BI (`/ferramentas/bi`) — origem dos números (tarefa 4) (Admin, BI e IA)
- Status auditoria: STUB/MOCK | Prioridade: P0 | Esforco: M
- Impacto no negocio: o vendedor vê saúde, risco de churn e pitch de IA inventados para um cliente novo e pode agir com base neles.

## Estado real conferido

PRONTO em main e877d0c58. `isMock` propagado com tooltip honesto em `src/components/bi/ClientCategoryRadar.tsx`, `ClientOverview360.tsx`, `ClientVsIndustryComparison.tsx`, `IndustryTrendingProducts.tsx`.

## O que falta (auditoria)

estado vazio honesto ("cliente sem histórico"), propagar `isMock` a todos os painéis e ao Copilot, separar "erro" de "sem dados" e calcular categorias reais (order_items + categoria).

## Camadas afetadas

- Front (BI 360)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- Componentes BI (4 pain?is)


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (em main)
