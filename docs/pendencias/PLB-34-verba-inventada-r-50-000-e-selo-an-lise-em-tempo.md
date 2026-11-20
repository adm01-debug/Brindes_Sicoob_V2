# PLB-34 — Verba inventada (R$ 50.000) e selo "Análise em Tempo Real"

- Origem: Verba (Plano original, benchmark e backlog)
- Status auditoria: STUB/MOCK | Prioridade: P2 | Esforco: P
- Impacto no negocio: o aprovador vê uma verba que a PA não tem.

## Estado real conferido

IMPLEMENTADO em main - OrderDetailPage.tsx:294 passa verba_total ?? null (sem presumir R$ 50.000); OrderBudgetIntelligence.tsx:29-55 mostra "Verba nao configurada" sem cadastro e "Dados da competencia" com cadastro; tests/components/data-trust-indicators.test.tsx:60-68 cobre estado sem verba. Validacao em producao ainda NAO executada nesta sessao.

## O que falta (auditoria)

mostrar "verba não configurada" em vez de R$ 50.000 e retirar o selo.

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
